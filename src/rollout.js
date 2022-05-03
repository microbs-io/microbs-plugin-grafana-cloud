/*
 * rollout.js
 *
 * Deploy the grafana-agent service to Kubernetes.
 */

// Standard packages
const path = require('path')

// Main packages
const { rollout } = require('@microbs.io/core')

module.exports = async (opts) => {
  var opts = opts || {}
  opts.skaffoldFilepath = path.join(__dirname, 'skaffold.yaml')
  return await rollout.run(opts)
}
