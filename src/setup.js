// Standard packages
const { URL } = require('url')

// Main packages
const { config, context, logger, state, utils } = require('@microbs.io/core')

// Plugin packages
const constants = require('./constants')
const probe = require('./probe')
const rollout = require('./rollout')

/**
 * Validate configuration.
 */
const validate = () => {
  const requiredFields = [
    'deployment.name',
    'plugins.grafana-cloud.api_key',
    'plugins.grafana-cloud.org_slug',
  ]
  if (!utils.configHas(requiredFields)) {
    logger.error()
    logger.error(`You must set these variables in ${context.get('path.config')} to setup Grafana Cloud:`)
    logger.error()
    logger.error(requiredFields)
    process.exit(1)
  }
}

const getSyntheticMonitoringProbes = async (dataSourceId) => {
  const proxyId = dataSourceId || await probe.getSyntheticsDataSourceId()
  const url = `${state.get('plugins.grafana-cloud.grafana.url')}/api/datasources/proxy/${proxyId}/sm/probe/list`
  var response
  try {
    response = await utils.http({
      method: 'get',
      url: url,
      headers: constants.grafanaApiHeaders()
    })
  } catch (err) {
    logger.error(err)
    return
  }
  if (response.status == 200 && response.data)
    return response.data
  else
    logger.error('...failed to list synthetic monitoring probes.')
}

const setupSyntheticMonitoringProbe = async (dataSourceId) => {
  const proxyId = dataSourceId || await probe.getSyntheticsDataSourceId()
  const probeName = 'Local'
  logger.info(`Creating synthetic monitoring probe: ${probeName}`)
  const url = `${state.get('plugins.grafana-cloud.grafana.url')}/api/datasources/proxy/${proxyId}/sm/probe/add`
  logger.debug(`POST ${url}`)
  const data = {
    name: probeName,
    public: false,
    latitude: 0,
    longitude: 0,
    region: config.get('plugins.grafana-cloud.region'),
    labels: [{
    	name: 'k8s_cluster',
    	value: 'microbs'
    }],
    online: false,
    onlineChange: 0,
    version: 'unknown',
    deprecated: false
  }
  var response
  while (true) {
    try {
      response = await utils.http({
        method: 'post',
        url: url,
        headers: constants.grafanaApiHeaders(),
        data: data
      })
      if (response.status == 503 && response.data.code == 'Loading') {
        await utils.sleep(1000)
        continue
      } else if (response.status == 200) {
        if (response.data && response.data.token && response.data.probe && response.data.probe.id) {
          state.set('plugins.grafana-cloud.synthetic_monitoring.probe.id', response.data.probe.id)
          state.set('plugins.grafana-cloud.synthetic_monitoring.probe.token', response.data.token)
          state.save()
          logger.info(`...created: ${probeName} [id=${response.data.probe.id}]`)
        } else {
          logger.warn(`...failed to get token for probe: ${probeName}`)
        }
        return
      } else {
        if (response.data && response.data.msg && response.data.msg.includes('Duplicate'))
          logger.info(`...exists: ${probeName}`)
        else
          logger.info(`...failure: ${probeName}`)
        return
      }
    } catch (err) {
      logger.error(err)
      return
    }
  }
}

const setupSyntheticMonitoringDatasource = async (accessToken, dashboards) => {
  logger.info(`Creating synthetic monitoring datasource...`)
  var url = `${state.get('plugins.grafana-cloud.grafana.url')}/api/datasources`
  var response
  while (true) {
    try {
      response = await utils.http({
        method: 'post',
        url: url,
        headers: constants.grafanaApiHeaders(),
        data: {
          name: 'Synthetic Monitoring',
          type: 'synthetic-monitoring-datasource',
          access: 'proxy',
          isDefault: false,
          jsonData: {
            apiHost: 'https://synthetic-monitoring-api.grafana.net',
            dashboards: dashboards,
            initialized: true,
            metrics: {
              grafanaName: `grafanacloud-${state.get('plugins.grafana-cloud.stack_slug')}-prom`,
              hostedId: state.get('plugins.grafana-cloud.prometheus.username')
            },
            logs: {
              grafanaName: `grafanacloud-${state.get('plugins.grafana-cloud.stack_slug')}-logs`,
              hostedId: state.get('plugins.grafana-cloud.loki.username')
            }
          },
          secureJsonData: {
            accessToken: accessToken
          }
        }
      })
    } catch (err) {
      logger.error(err)
      return
    }
    if (response.status == 503 && response.data.code == 'Loading') {
      await utils.sleep(1000)
      continue
    } else if (response.status == 200 && response.data && response.data.datasource) {
      logger.info('...done.')
      return true
    } else if (response.status == 409) {
      logger.info('...exists.')
      return true
    } else {
      logger.error('...failure.')
      logger.error(response.data)
      return
    }
  }
}

const setupSyntheticMonitoringDashboard = async (dashboardName, folderId) => {
  
  // Get the dashboard
  logger.info(`Getting synthetic monitoring dashboard: ${dashboardName}`)
  var url = `${state.get('plugins.grafana-cloud.grafana.url')}/public/plugins/grafana-synthetic-monitoring-app/dashboards/${dashboardName}.json`
  var response
  while (true) {
    try {
      response = await utils.http({
        method: 'get',
        url: url,
        headers: constants.grafanaApiHeaders()
      })
    } catch (err) {
      logger.error(err)
      return
    }
    if (response.status == 503 && response.data.code == 'Loading') {
      await utils.sleep(1000)
      continue
    } else if (response.status == 200 && response.data && response.data.uid) {
      logger.info('...done.')
      break
    } else {
      logger.error('...failure:')
      logger.error(response.data)
      return
    }
  }
  const dashboard = response.data
  
  // Import the dashboard
  logger.info(`Importing synthetic monitoring dashboard: ${dashboardName}`)
  const slug = `synthetic-monitoring-` + dashboardName.split('-')[1]
  var url = `${state.get('plugins.grafana-cloud.grafana.url')}/api/dashboards/import`
  var response
  while (true) {
    try {
      response = await utils.http({
        method: 'post',
        url: url,
        headers: constants.grafanaApiHeaders(),
        data: {
          dashboard: dashboard,
          folderId: folderId,
          overwrite: true,
          inputs: [{
            name: 'DS_SM_METRICS',
            type: 'datasource',
            pluginId: 'prometheus',
            value: `grafanacloud-${state.get('plugins.grafana-cloud.stack_slug')}-prom`
          }, {
            name: 'DS_SM_LOGS',
            type: 'datasource',
            pluginId: 'loki',
            value: `grafanacloud-${state.get('plugins.grafana-cloud.stack_slug')}-logs`
          }, {
            name: 'DS_SM_SM',
            type: 'datasource',
            pluginId: 'synthetic-monitoring-datasource',
            value: 'Synthetic Monitoring'
          }]
        }
      })
    } catch (err) {
      logger.error(err)
      return
    }
    if (response.status == 503 && response.data.code == 'Loading') {
      await utils.sleep(1000)
      continue
    } else if (response.status == 200) {
      logger.info('...done.')
      return {
        title: dashboard.title,
        uid: dashboard.uid,
        json: `${dashboardName}.json`,
        version: dashboard.version,
        latestVersion: dashboard.version
      }
    } else {
      logger.error('...failure:')
      logger.error(response.data)
      return
    }
  }
}

const setupSyntheticMonitoringDashboards = async (folderId) => {
  const dashboardNames = [
    'sm-http', 'sm-ping', 'sm-dns', 'sm-tcp', 'sm-summary', 'sm-traceroute'
  ]
  const dashboards = []
  for (var i in dashboardNames) {
    const dashboard = await setupSyntheticMonitoringDashboard(dashboardNames[i], folderId)
    dashboards.push(dashboard)
  }
  return dashboards
}

const setupSyntheticMonitoringFolder = async () => {
  logger.info('Creating synthetic monitoring folder...')
  var url = `${state.get('plugins.grafana-cloud.grafana.url')}/api/folders`
  
  // Check if the folder exists
  var response
  while (true) {
    try {
      response = await utils.http({
        method: 'get',
        url: url,
        headers: constants.grafanaApiHeaders()
      })
    } catch (err) {
      logger.error(err)
      return
    }
    if (response.status == 503 && response.data.code == 'Loading') {
      await utils.sleep(1000)
      continue
    } else if (response.status == 200 && response.data) {
      // Return the id of the "Synthetic Monitoring" folder if it exists
      for (var i in response.data)
        if (response.data[i].title == 'Synthetic Monitoring')
          return response.data[i].id
      break
    } else {
      logger.error('...failure:')
      logger.error(response.data)
      return
    }
  }
  
  // Create the folder
  var response
  while (true) {
    try {
      response = await utils.http({
        method: 'post',
        url: url,
        headers: constants.grafanaApiHeaders(),
        data: {
          title: 'Synthetic Monitoring'
        }
      })
    } catch (err) {
      logger.error(err)
      return
    }
    if (response.status == 503 && response.data.code == 'Loading') {
      await utils.sleep(1000)
      continue
    } else if (response.status == 200 && response.data) {
      logger.info('...done.')
      break
    } else {
      logger.error('...failure:')
      logger.error(response.data)
      break
    }
  }
  
  // Return the id of the "Synthetic Monitoring" folder.
  for (var i in response.data)
    if (response.data.title == 'Synthetic Monitoring')
      return response.data.id
}

const setupSyntheticMonitoringPlugin = async () => {
  logger.info('Installing synthetic monitoring plugin...')
  var url = `${state.get('plugins.grafana-cloud.grafana.url')}/api/plugin-proxy/grafana-synthetic-monitoring-app/install`
  var response
  while (true) {
    try {
      response = await utils.http({
        method: 'post',
        url: url,
        headers: constants.grafanaApiHeaders(),
        data: {
          stackId: state.get('plugins.grafana-cloud.stack_id'),
          metricsInstanceId: state.get('plugins.grafana-cloud.prometheus.username'),
          logsInstanceId: state.get('plugins.grafana-cloud.loki.username')
        }
      })
    } catch (err) {
      logger.error(err)
      return
    }
    if (response.status == 404 || response.status == 503) {
      await utils.sleep(1000)
      continue
    } else if (response.status == 200 && response.data && response.data.accessToken) {
      logger.info('...done.')
      return response.data.accessToken
    } else {
      logger.error('...failure:')
      logger.error(response.data)
      return
    }
  }
}

/**
 * Initialize the Synthetic Monitoring plugin
 */
const setupSyntheticMonitoring = async () => {
  
  // Ensure stack is ready
  await probe.waitForGrafanaCloud()
  
  // Setup synthetic monitoring plugin
  var accessToken = await setupSyntheticMonitoringPlugin()
  if (!accessToken)
    return logger.error('...failed to install the synthetic monitoring plugin.')
  
  // Setup synthetic monitoring folder
  var folderId = await setupSyntheticMonitoringFolder()
  if (!folderId)
    return logger.error('...failed to setup the "Synthetic Monitoring" folder.')
  
  // Setup synthetic monitoring dashboards
  var dashboards = await setupSyntheticMonitoringDashboards(folderId)
  if (!dashboards)
    return logger.error('...failed to setup the synthetic monitoring dashboards.')
    
  // Setup synthetic monitoring datasource
  var success = await setupSyntheticMonitoringDatasource(accessToken, dashboards)
  if (!success)
    return logger.error('...failed to setup the synthetic monitoring datasource.')
  
  // Setup synthetic monitoring probe
  await setupSyntheticMonitoringProbe()
}

/**
 * Initialize the Kubernetes Integration
 */
const setupKubernetesIntegration = async () => {
  
  // Ensure stack is ready
  await probe.waitForGrafanaCloud()
  
  // Setup Kubernetes integration
  logger.info('Installing Kubernetes integration...')
  var response
  while (true) {
    try {
      response = await utils.http({
        method: 'post',
        url: `${state.get('plugins.grafana-cloud.grafana.url')}/api/plugin-proxy/grafana-easystart-app/int-api/v2/stacks/${state.get('plugins.grafana-cloud.stack_id')}/integrations/kubernetes/install`,
        headers: constants.grafanaApiHeaders(),
        data: {
          configuration: {
            configurable_logs: {
              logs_disabled: false
            }
          }
        }
      })
    } catch (err) {
      logger.error(err)
      return
    }
    if (response.status == 404 || response.status == 503) {
      await utils.sleep(1000)
      continue
    } else if (response.status >= 200 && response.status <= 299) {
      var response
      try {
        response = await utils.http({
          method: 'get',
          url: `${state.get('plugins.grafana-cloud.grafana.url')}/api/plugin-proxy/grafana-easystart-app/int-api/v2/stacks/${state.get('plugins.grafana-cloud.stack_id')}/integrations/kubernetes/`,
          headers: constants.grafanaApiHeaders()
        })
      } catch (err) {
        logger.error(err)
        return
      }
      logger.info('...done.')
    } else {
      logger.error('...failure:')
      logger.error(response.data)
    }
    break
  }
}

module.exports = async () => {
  validate()

  // Check if 'deployment.name' exists on Grafana Cloud
  var stackExists = false
  if (state.get('plugins.grafana-cloud.stack_id')) {
    logger.info('')
    logger.info(`Stack ID exists in .state file: ${state.get('plugins.grafana-cloud.stack_id')}`)
    logger.info('')
    logger.info('Checking if the stack exists on Grafana Cloud...')
    stackExists = await probe.statusGrafanaCloud()
    if (stackExists)
      logger.info(`...stack exists on Grafana Cloud: 'microbs-${config.get('deployment.name')}' [stack_id=${state.get('plugins.grafana-cloud.stack_id')}, stack_slug=${state.get('plugins.grafana-cloud.stack_slug')}]`)
    else
      logger.info('...stack does not exist on Grafana Cloud. A new one will be created, and the .state file will be updated.')
  }

  // Create stack if it doesn't exist on Grafana Cloud
  if (!stackExists) {
    logger.info('')
    logger.info('Creating Grafana Cloud stack...')
    const data = {}
    data.name = `microbs-${config.get('deployment.name')}`
    data.slug = data.name.replace(/[^A-Za-z0-9]/g, '').toLowerCase()
    if (config.get('plugins.grafana-cloud.region'))
      data.region = config.get('plugins.grafana-cloud.region')
    var response
    try {
      response = await utils.http({
        method: 'post',
        url: 'https://grafana.com/api/instances',
        headers: constants.grafanaCloudApiHeaders(),
        data: data
      })
    } catch (err) {
      return logger.error(err.message)
    }

    // Get stack info
    if (response.status == 200) {
      logger.info(`...created: 'microbs-${config.get('deployment.name')}' [stack_id=${response.data.id}, stack_slug=${response.data.slug}]`)
    } else {
      logger.error('...failure:')
      logger.error(response.data)
      process.exit(1)
    }

    // Get deployment info and update .state file
    state.set('plugins.grafana-cloud.stack_id', response.data.id)
    state.set('plugins.grafana-cloud.stack_slug', response.data.slug)
    state.set('plugins.grafana-cloud.grafana.url', response.data.url)
    state.set('plugins.grafana-cloud.loki.endpoint', `${response.data.hlInstanceUrl}/api/prom/push`)
    state.set('plugins.grafana-cloud.loki.url', response.data.hlInstanceUrl)
    state.set('plugins.grafana-cloud.loki.username', response.data.hlInstanceId)
    state.set('plugins.grafana-cloud.prometheus.endpoint', `${response.data.hmInstancePromUrl}/api/prom/push`)
    state.set('plugins.grafana-cloud.prometheus.url', response.data.hmInstancePromUrl)
    state.set('plugins.grafana-cloud.prometheus.username', response.data.hmInstancePromId)
    state.set('plugins.grafana-cloud.tempo.endpoint', `${(new URL(response.data.htInstanceUrl)).hostname}:443`)
    state.set('plugins.grafana-cloud.tempo.url', response.data.htInstanceUrl)
    state.set('plugins.grafana-cloud.tempo.username', response.data.htInstanceId)
    state.save()

    // Create Grafana API Key
    //
    // This key is different from the Grafana Cloud API Key. It's used to manage
    // resources such as dashboards within the Grafana instance.
    logger.info('')
    logger.info('Creating Grafana API Key...')
    while (true) {
      var response
      try {
        response = await utils.http({
          method: 'post',
          url: `https://grafana.com/api/instances/${state.get('plugins.grafana-cloud.stack_slug')}/api/auth/keys`,
          headers: constants.grafanaCloudApiHeaders(),
          data: {
            name: 'microbs',
            role: 'Admin'
          }
        })
      } catch (err) {
        return logger.error(err.message)
      }

      if (response.status == 503 && response.data.code == 'Loading') {
        await utils.sleep(1000)
        continue
      }

      // Get stack info
      if (response.status == 200) {
        logger.info('...created.')
        state.set('plugins.grafana-cloud.grafana_api_key', response.data.key)
        state.save()
        break
      } else if (response.status == 409 && response.data.message.includes('must be unique')) {
        logger.info('...exists.')
        break
      } else {
        logger.error('...failure:')
        logger.error(response.data)
        process.exit(1)
      }
    }
  }
  
  // Setup Kubernetes integration
  await setupKubernetesIntegration()
  
  // Setup synthetic monitoring
  await setupSyntheticMonitoring()

  // Deploy the grafana-agent service to Kubernetes
  await rollout()
}
