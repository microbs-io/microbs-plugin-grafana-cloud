/*
 * validate.js
 */

// Main packages
const { config, logger } = require('@microbs.io/core')

/**
 * Validate the fields and values of the given config file.
 */
const validateConfig = () => {
  const results = []
  try {
    config.init()
  } catch (e) {
    return [{
      success: false,
      message: e
    }]
  }

  // Validate required fields
  const requiredAlways = [
    'plugins.grafana-cloud.api_key',
    'plugins.grafana-cloud.org_slug',
    'plugins.grafana-cloud.region',
  ]
  var hasErrors = false
  for (var i in requiredAlways) {
    if (!config.get(requiredAlways[i])) {
      hasErrors = true
      results.push({
        success: false,
        message: `'${requiredAlways[i]}' is required but missing from grafana-cloud plugin config.`
      })
    }
  }
  if (!hasErrors) {
    return [{
      success: true,
      message: 'no problems detected in grafana-cloud plugin config.'
    }]
  }
  return results
}

module.exports = async () => {
  const results = []
  validateConfig().forEach(
    (result) => results.push(result)
  )
  return results
}
