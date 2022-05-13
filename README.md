[![Build Status](https://github.com/microbs-io/microbs-plugin-grafana-cloud/workflows/Commit/badge.svg?branch=main)](https://github.com/microbs-io/microbs-plugin-grafana-cloud/actions)
[![npm](https://img.shields.io/npm/v/@microbs.io/plugin-grafana-cloud?color=%2300B5AD&label=Latest)](https://www.npmjs.com/package/@microbs.io/plugin-grafana-cloud)
![Apache 2.0](https://img.shields.io/npm/l/@microbs.io/plugin-grafana-cloud?color=%23f6f8fa)

# microbs-plugin-grafana-cloud

## Contents

* [Usage](#usage)
* [Prerequisites](#prerequisites)
* [Configuration](#configuration)


## [](usage)Usage

Before using the `grafana-cloud` plugin you must meet its [prerequisites](#prerequisites).


### `setup`

> Grafana Cloud has a free tier that works for most usage of microbs ([more info](https://grafana.com/pricing/)).


When running [`microbs setup [-o]`](https://microbs.io/docs/usage/cli/#setup), the
`grafana-cloud` plugin creates a Grafana Cloud stack using the
[Grafana Cloud API](https://grafana.com/docs/grafana-cloud/reference/cloud-api/#create-stack). Then it deploys a `grafana-agent` service to the Kubernetes cluster. This agent
autodiscovers logs and metrics from the Kubernetes nodes and pods, and collects
OpenTelemetry traces and metrics from the application running on Kubernetes, and
ships that data to the Grafana Cloud stack.

### `rollout`

The `grafana-cloud` plugin is unaffected by [`microbs rollout`](https://microbs.io/docs/usage/cli#rollout).

### `destroy`

When running [`microbs destroy [-o]`](https://microbs.io/docs/usage/cli/#destroy), the
`grafana-cloud` plugin destroys your Grafana Cloud stack using the
[Grafana Cloud API](https://grafana.com/docs/grafana-cloud/reference/cloud-api/#delete-stack).


## [](prerequisites)Prerequisites


### Install the plugin

microbs installs this plugin automatically when you [install microbs](https://microbs.io/docs/overview/getting-started/).

To reinstall this plugin, run this command:

`microbs plugins install grafana-cloud`

To upgrade this plugin to the latest version, run this command:

`microbs plugins update grafana-cloud`


### Create Grafana Cloud resources

You must create a [Grafana Cloud account](https://grafana.com/auth/sign-up/create-user)
and obtain a [Grafana Cloud API Key](https://grafana.com/docs/grafana-cloud/reference/create-api-key/) before using the `grafana-cloud` plugin.


## [](configuration)Configuration

This section documents the `grafana-cloud` plugin configurations for [config.yaml](https://microbs.io/docs/usage/configuration).

### Required fields

#### [](plugins.grafana-cloud.api_key)`plugins.grafana-cloud.api_key`

The value of your [Grafana Cloud API Key](https://grafana.com/docs/grafana-cloud/reference/create-api-key/).

Example: `eyJrIjoiZTlkNmY5MDdjYTlmZTMxNDYxZDZmZGUwMTdhYzJhZGE5ZDE1MGI2NCIsIm4iOiJjaGFuZ2VtZSIsImlkIjo5OTk5OTl9`

#### [](plugins.grafana-cloud.org_slug)`plugins.grafana-cloud.org_slug`

The slug of your organization name as it exists on Grafana Cloud.

If you're unsure what this is, [sign in](https://grafana.com/auth/sign-in) to
Grafana Cloud and look at the value of URL after `/orgs/`:

`https://grafana.com/orgs/acmecorp`

Example: `acmecorp`

#### [](plugins.grafana-cloud.region)`plugins.grafana-cloud.region`

The slug of the region in which to deploy your Grafana Cloud stack.

See the
[available regions](https://grafana.com/api/stack-regions) and refer to the
`slug` fields for a list of acceptable values.

Examples: `us`, `eu`, `au`
