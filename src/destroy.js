// Main packages
const { config, context, logger, state, utils } = require('@microbs.io/core')

// Plugin packages
const constants = require('./constants')
const rollout = require('./rollout')

/**
 * Validate configuration.
 */
const validate = () => {
  const requiredFields = [
    'plugins.grafana-cloud.api_key',
  ]
  if (!utils.configHas(requiredFields)) {
    logger.error()
    logger.error(`You must set these variables in ${config.get('path.config')} to destroy Grafana Cloud:`)
    logger.error()
    logger.error(requiredFields)
    process.exit(1)
  }
}

module.exports = async () => {
  validate()

  // Remove the grafana-agent service from Kubernetes
  await rollout({ action: 'delete' })

  // Destroy the Grafana Cloud stack
  if (!state.get('plugins.grafana-cloud.stack_slug'))
    return logger.warn('There is no plugins.grafana-cloud.stack_slug to remove.')
  logger.info('')
  logger.info(`Removing Grafana Cloud deployment: 'microbs-${config.get('deployment.name')}' [stack_id=${state.get('plugins.grafana-cloud.stack_id')}, stack_slug=${state.get('plugins.grafana-cloud.stack_slug')}]`)
  var response
  try {
    response = await utils.http({
      method: 'delete',
      url: `https://grafana.com/api/instances/${state.get('plugins.grafana-cloud.stack_slug')}`,
      headers: constants.grafanaCloudApiHeaders()
    })
  } catch (err) {
    logger.error(err.message)
  }
  if (response.status == 200) {
    state.set('plugins.grafana-cloud.stack_id', `${state.get('plugins.grafana-cloud.stack_id')}-destroyed`)
    state.set('plugins.grafana-cloud.stack_slug', `${state.get('plugins.grafana-cloud.stack_slug')}-destroyed`)
    state.save()
    logger.info('...acknowledged. Grafana Cloud stack is destroyed.')
  } else if (response.status == 404) {
    logger.info(`...Grafana could not find the stack. It might have been destroyed already.`)
  }
}
