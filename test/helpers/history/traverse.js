'use strict'

const { expect } = require('chai')
const { db, aql } = require('@arangodb')
const request = require('@arangodb/request')
const { chain, sample, memoize, omit, isObject, pick, isEmpty } = require('lodash')
const init = require('../util/init')
const show = require('../../../lib/operations/show')
const { cartesian, generateFilters } = require('../util')
const { getNonServiceCollections, filter } = require('../../../lib/operations/helpers')
const { traverse: traverseHandler } = require('../../../lib/handlers/traverseHandlers')
const { getCollectionType, DOC_ID_REGEX } = require('../../../lib/helpers')
const {
  traverseSkeletonGraph, createNodeBracepath, removeFreeEdges, buildFilteredGraph
} = require('../../../lib/operations/traverse/helpers')

const { baseUrl, collectionPrefix } = module.context
const lineageCollName = module.context.collectionName('test_lineage')
const generateCombos = memoize(() => {
  return cartesian({
    timestamp: [null, ...init.getMilestones()],
    depth: [1, 2],
    edgeCollections: ['inbound', 'outbound', 'any'].map(dir => ({
      [lineageCollName]: dir
    }))
  })
}).bind(module, 'default')

// Public
function generateOptionCombos (bfs = true) {
  const uniqueVertices = ['none', 'path']
  const uniqueEdges = ['none', 'path']

  if (bfs) {
    uniqueVertices.push('global')
  }

  return cartesian({ bfs: [bfs], uniqueVertices, uniqueEdges })
}

function testTraverseSkeletonGraphWithParams ({ bfs, uniqueVertices, uniqueEdges }) {
  const vertexCollNames = init.getSampleDataRefs().vertexCollections
  const combos = generateCombos()
  combos.forEach(combo => {
    const { timestamp, depth, edgeCollections } = combo
    const svColl = db._collection(sample(vertexCollNames))
    const svid = svColl.any()._id

    const nodeGroups = traverseSkeletonGraph(timestamp, svid, depth, edgeCollections,
      { bfs, uniqueVertices, uniqueEdges })
    const params = JSON.stringify(Object.assign({ bfs, uniqueVertices, uniqueEdges }, combo))

    expect(nodeGroups, params).to.be.an.instanceOf(Object)
    expect(nodeGroups.vertices, params).to.be.an.instanceOf(Array)
    expect(nodeGroups.edges, params).to.be.an.instanceOf(Array)
    nodeGroups.vertices.forEach(vid => {
      expect(vid, params).to.match(DOC_ID_REGEX)
    })

    nodeGroups.edges.forEach(eid => {
      expect(eid, params).to.match(DOC_ID_REGEX)
    })
  })
}

function testTraverseWithParams ({ bfs, uniqueVertices, uniqueEdges }, traverseFn, useFilters = true) {
  const vertexCollNames = init.getSampleDataRefs().vertexCollections
  const collTypes = chain(getNonServiceCollections())
    .map(collName => [collName, getCollectionType(collName)])
    .fromPairs()
    .value()

  const combos = generateCombos()
  combos.forEach(combo => {
    const { timestamp, depth, edgeCollections } = combo
    const svColl = db._collection(sample(vertexCollNames))
    const svid = svColl.any()._id

    const queryParts = [
      aql`
        let collTypes = ${collTypes}
        
        for v, e in 0..${depth}
      `,
      aql.literal(`${edgeCollections[lineageCollName]} '${svid}'`),
      aql.literal(`graph '${collectionPrefix}test_ss_lineage'`),
      aql`
        options {bfs: ${bfs}, uniqueVertices: ${uniqueVertices}, uniqueEdges: ${uniqueEdges}}
        
        collect aggregate vertices = unique(v._id), edges = unique(e._id)
        
        let vGroups = (
          for vid in vertices
          let vp = parse_identifier(vid)
          collect coll = vp.collection into keys = vp.key
          
          return {coll, keys}
        )
        let eGroups = (
          for eid in edges[* filter CURRENT != null]
          let ep = parse_identifier(eid)
          collect coll = ep.collection into keys = ep.key
          
          return {coll, keys}
        )
        
        return {vertices: vGroups, edges: eGroups}
      `
    ]
    const query = aql.join(queryParts, '\n')
    const cursor = db._query(query)

    const unfilteredNodes = cursor.next()
    cursor.dispose()

    const vPath = createNodeBracepath(unfilteredNodes.vertices)
    const ePath = unfilteredNodes.edges.length ? createNodeBracepath(unfilteredNodes.edges) : null
    const timeBoundVertices = show(vPath, timestamp)
    const timeBoundEdges = ePath ? show(ePath, timestamp) : []
    const vFilter = useFilters ? generateFilters(timeBoundVertices) : null
    const eFilter = useFilters && timeBoundEdges.length ? generateFilters(timeBoundEdges) : null

    const filteredTraversal = traverseFn(timestamp, svid, depth, edgeCollections,
      { bfs, uniqueVertices, uniqueEdges, vFilter, eFilter })

    const params = JSON.stringify(Object.assign({ bfs, uniqueVertices, uniqueEdges, svid, vFilter, eFilter }, combo))
    expect(filteredTraversal, params).to.be.an.instanceOf(Object)
    expect(filteredTraversal.vertices, params).to.be.an.instanceOf(Array)
    expect(filteredTraversal.edges, params).to.be.an.instanceOf(Array)

    const filteredTimeBoundVertices = vFilter ? filter(timeBoundVertices, vFilter) : timeBoundVertices
    const filteredTimeBoundEdges = eFilter ? filter(timeBoundEdges, eFilter) : timeBoundEdges
    removeFreeEdges(filteredTimeBoundVertices, filteredTimeBoundEdges)

    const expectedTraversal = filteredTimeBoundVertices.length ? buildFilteredGraph(svid, filteredTimeBoundVertices,
      filteredTimeBoundEdges) : { vertices: [], edges: [] }

    expect(filteredTraversal.vertices, params).to.have.deep.members(expectedTraversal.vertices)
    expect(filteredTraversal.edges, params).to.have.deep.members(expectedTraversal.edges)
  })
}

function traverseHandlerWrapper (timestamp, svid, depth, edgeCollections, options) {
  const req = { queryParams: { timestamp, svid, depth }, body: { edges: edgeCollections } }

  if (isObject(options)) {
    Object.assign(req.queryParams, omit(options, 'vFilter', 'eFilter'))
    for (const key of ['vFilter', 'eFilter']) {
      if (!isEmpty(options[key])) {
        req.body[key] = options[key]
      }
    }
  }

  return traverseHandler(req)
}

function traversePostWrapper (timestamp, svid, depth, edgeCollections, options) {
  const req = { json: true, timeout: 120, qs: { svid, depth }, body: { edges: edgeCollections } }

  if (timestamp) {
    req.qs.timestamp = timestamp
  }

  if (isObject(options)) {
    Object.assign(req.qs, omit(options, 'vFilter', 'eFilter'))
    for (const key of ['vFilter', 'eFilter']) {
      if (!isEmpty(options[key])) {
        req.body[key] = options[key]
      }
    }
  }

  const response = request.post(`${baseUrl}/history/traverse`, req)
  expect(response).to.be.an.instanceOf(Object)

  const params = JSON.stringify({ request: req, response: pick(response, 'statusCode', 'body', 'message') })
  expect(response.statusCode, params).to.equal(200)

  return JSON.parse(response.body)
}

module.exports = {
  generateOptionCombos,
  testTraverseSkeletonGraphWithParams,
  testTraverseWithParams,
  traverseHandlerWrapper,
  traversePostWrapper
}
