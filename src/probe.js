/*
 * probej.s
 *
 * Check the status of various resources.
 */

// Third-party packages
const _ = require('lodash')

// Main packages
const { logger, state, utils } = require('@microbs.io/core')

// Plugin packages
const constants = require('./constants')

const getDataSources = async () => {
  var url = `${state.get('plugins.grafana-cloud.grafana.url')}/api/datasources`
  var response
  try {
    response = await utils.http({
      method: 'get',
      url: url,
      headers: constants.grafanaApiHeaders()
    })
    return response.data
  } catch (err) {
    logger.error(err)
  }
}

module.exports.getDataSources = getDataSources

module.exports.getSyntheticsDataSourceId = async () => {
  const dataSources = await getDataSources()
  for (var i in dataSources) {
    const dataSource = dataSources[i]
    if (dataSource.type == "synthetic-monitoring-datasource")
      return dataSource.id
  }
}

const statusGrafanaCloud = async () => {
  try {
    let response = await utils.http({
      method: 'get',
      url: `https://grafana.com/api/instances/${state.get('plugins.grafana-cloud.stack_slug')}`,
      headers: constants.grafanaCloudApiHeaders()
    })
    if (_.range(200, 300).includes(response.status) && response.data.status == 'active')
      return true
    if (response.status == 503)
      return false
    if (_.range(400, 600).includes(response.status) && !_.range(404, 411).includes(response.status))
      throw new Error(response)
  } catch (err) {
    logger.error(err.message)
  }
  return false
}
module.exports.statusGrafanaCloud = statusGrafanaCloud

const grafanaStackReady = async () => {
  try {
    let response = await utils.http({
      method: 'get',
      url: `https://${state.get('plugins.grafana-cloud.stack_slug')}.grafana.net/api/health`,
      headers: constants.grafanaCloudApiHeaders()
    })
    if (response.status == 200)
      return true
  } catch (err) {
    logger.error(err.message)
  }
  return false
}

module.exports.grafanaStackReady = grafanaStackReady

module.exports.waitForGrafanaCloud = async () => {
  var stackExists
  while (!stackExists) {
    stackExists = await grafanaStackReady()
    await utils.sleep(1000)
  }
}
