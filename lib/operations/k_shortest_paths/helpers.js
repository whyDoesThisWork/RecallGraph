'use strict'

const { SERVICE_COLLECTIONS, SERVICE_GRAPHS, getComponentTagOption } = require('../../helpers')
const { db, query } = require('@arangodb')
const { mapValues, chain } = require('lodash')
const { utils: { attachSpan } } = require('foxx-tracing')
const { getEnds } = require('../traverse/helpers')

const skeletonVerticesColl = db._collection(SERVICE_COLLECTIONS.skeletonVertices)
const cto = getComponentTagOption(__filename)

exports.getAllPaths = attachSpan(function getAllPaths (timestamp, svid, evid, depth, edgeCollections) {
  depth *= 2

  const sv = skeletonVerticesColl.firstExample('meta.id', svid)
  const ev = skeletonVerticesColl.firstExample('meta.id', evid)

  if ((sv.valid_since <= timestamp) && (!sv.valid_until || (sv.valid_until > timestamp)) &&
      (ev.valid_since <= timestamp) && (!ev.valid_until || (ev.valid_until > timestamp))) {
    if (sv._id === ev._id) {
      return [
        {
          vertices: [sv._id],
          edges: []
        }
      ]
    }

    const ecs = mapValues(edgeCollections, getEnds)

    return query`
      let ecs = ${ecs}
      let eca = attributes(ecs)
      
      for v, e, p in 2..${depth}
      any ${sv._id}
      graph ${SERVICE_GRAPHS.skeleton}
      
      prune v == null || v._id == ${ev._id} ||
        v.valid_since > ${timestamp} ||
        (has(v, 'valid_until') ? v.valid_until <= ${timestamp} : false) ||
        e != null &&
        (e.valid_since > ${timestamp} || (has(e, 'valid_until') ? e.valid_until <= ${timestamp} : false)) ||
        is_same_collection(${SERVICE_COLLECTIONS.skeletonEdgeHubs}, v) &&
        (
          parse_identifier(v.meta.id).collection not in eca ||
          ((v._id == e._from) ? '_from' : '_to') not in ecs[parse_identifier(v.meta.id).collection]
        )
        
      options {uniqueVertices: 'path'}
        
      filter v._id == ${ev._id}
      filter e.valid_since <= ${timestamp} && (has(e, 'valid_until') ? e.valid_until > ${timestamp} : true)
      
      let seh = is_same_collection(${SERVICE_COLLECTIONS.skeletonEdgeHubs}, v) ? v : p.vertices[-2]
      let op = seh && parse_identifier(seh.meta.id)
      let oc = op && op.collection
      let dKey = (v._id == e._from) ? '_from' : '_to'
      filter oc in eca && dKey in ecs[oc]
      
      let maxIdx = length(p.vertices) - 1
      return merge(
        for i in 0..maxIdx
        let t = i % 2 == 0 ? 'vertices' : 'edges'
        collect type = t into elements = p.vertices[i].meta.id
        return {[type]: elements}
      )
      
  `.toArray()
  } else {
    return []
  }
}, 'getAllPaths', cto)

exports.buildPaths = attachSpan(function buildPaths (built, paths) {
  const builtPaths = []

  for (const path of paths) {
    const builtPath = {
      vertices: [],
      edges: []
    }

    let pathIsBroken = false

    for (const type in path) {
      for (const id of path[type]) {
        const obj = built[type].find(node => node._id === id)
        if (!obj) {
          pathIsBroken = true
          break
        }

        builtPath[type].push(obj)
      }

      if (pathIsBroken) {
        break
      }
    }

    if (!pathIsBroken) {
      builtPaths.push(builtPath)
    }
  }

  return builtPaths
}, 'buildPaths', cto)

exports.kShortestPaths = attachSpan(function kShortestPaths (builtPaths, weightFn, k) {
  return chain(builtPaths)
    .map(path => {
      path.cost = path.edges.reduce((cost, edge) => cost + weightFn(edge), 0)

      return path
    })
    .sortBy('cost')
    .slice(0, k)
    .value()
}, 'kShortestPaths', cto)
