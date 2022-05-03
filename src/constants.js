/*
 * constants.js
 *
 * Constant values used throughout the plugin.
 */

// Standard packages
const path = require('path')

// Main packages
const { config, context, state } = require('@microbs.io/core')

/**
 * Absolute path to the directory of this plugin.
 */
module.exports.pluginHome = () => {
  return path.join(context.get('homepath'), 'cli', 'src', 'plugins', 'observability', 'grafana-cloud')
}

/**
 * Shorthand for setting Grafana Cloud API headers.
 */
module.exports.grafanaCloudApiHeaders = (grafanaCloudApiKey) => {
  return {
    Authorization: `Bearer ${grafanaCloudApiKey || config.get('plugins.grafana-cloud.api_key')}`
  }
}

/**
 * Shorthand for setting Grafana API headers.
 */
module.exports.grafanaApiHeaders = (grafanaApiKey) => {
  return {
    Authorization: `Bearer ${grafanaApiKey || state.get('plugins.grafana-cloud.grafana_api_key')}`
  }
}
