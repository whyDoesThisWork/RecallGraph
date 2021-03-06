'use strict'

const showOp = require('../operations/show')
const { omit } = require('lodash')

function show (req) {
  const path = req.queryParams.path || req.body.path
  const { timestamp } = req.queryParams

  const options = omit(req.queryParams, 'path', 'timestamp', 'postFilter')
  options.postFilter = req.queryParams.postFilter || (req.body && req.body.postFilter)

  return showOp(path, timestamp, options)
}

module.exports = {
  show
}
