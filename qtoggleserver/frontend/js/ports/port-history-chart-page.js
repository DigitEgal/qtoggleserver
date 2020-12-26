
import $      from '$qui/lib/jquery.module.js'
import Logger from '$qui/lib/logger.module.js'

import {gettext}        from '$qui/base/i18n.js'
import * as Toast       from '$qui/messages/toast.js'
import * as StringUtils from '$qui/utils/string.js'
import * as Window      from '$qui/window.js'

import ChartPage                        from '$app/common/chart-page.js'
import {ChartPageOptionsForm}           from '$app/common/chart-page.js'
import HistoryDownloadManager           from '$app/common/history-download-manager.js'
import {HistoryDownloadTooManyRequests} from '$app/common/history-download-manager.js'


const logger = Logger.get('qtoggle.common.porthistorychartpage')

const INITIAL_INTERVAL = 24 * 3600 * 1000 /* Last 24h */
const MAX_FETCH_REQUESTS = 5 /* This translates into at most 50k data points in an interval */
const TIME_WINDOW_CHOICES = [
    {label: gettext('1m|1 minute'), value: 60},
    {label: gettext('10m|10 minutes'), value: 600},
    {label: gettext('1h|1 hour'), value: 3600},
    {label: gettext('1d|1 day'), value: 3600 * 24},
    {label: gettext('1w|1 week'), value: 3600 * 24 * 7},
    {label: gettext('1M|1 month'), value: 3600 * 24 * 31},
    {label: gettext('1Y|1 year'), value: 3600 * 24 * 366},
    {label: gettext('10Y|10 years'), value: 3600 * 24 * 3652}
]


class PortHistoryChartPageOptionsForm extends ChartPageOptionsForm {
}


/**
 * @alias qtoggle.ports.PortHistoryChart
 * @extends qtoggle.common.ChartPage
 */
class PortHistoryChartPage extends ChartPage {

    /**
     * @constructs
     * @param {Object} port
     */
    constructor(port) {
        let displayName = port['display_name'] || port['id']
        let now = new Date().getTime()
        let from = now - INITIAL_INTERVAL
        let isBoolean = port['type'] === 'boolean'

        super({
            title: StringUtils.formatPercent(gettext('%(port)s History'), {port: displayName}),
            type: 'time',
            pathId: 'history',
            chartOptions: {
                showTooltips: true,
                showDataPoints: null,
                showMajorTicks: true,
                yTicksStepSize: isBoolean ? 1 : null,
                yTicksLabelCallback: isBoolean ? value => value ? gettext('On') : gettext('Off') : null,
                panZoomMode: 'x',
                panZoomXMax: now,
                xMin: from,
                xMax: now,
                unitOfMeasurement: port['unit'],
                stepped: isBoolean
            }
        })

        this._port = port
        this._isBoolean = isBoolean
        this._historyDownloadManager = new HistoryDownloadManager(port)
        this._timeWindowChoiceButtons = null
        this._prevButton = null
        this._nextButton = null
    }

    load() {
        let {min: from, max: to} = this.getXRange()
        this.chartToTimeWindow()
        return this.fetchAndShowHistory(from, to)
    }

    handlePanZoomEnd(xMin, xMax, yMin, yMax) {
        this.chartToTimeWindow()
        this.fetchAndShowHistory(/* from = */ xMin, /* to = */ xMax)
    }

    fetchAndShowHistory(from, to) {
        this.setProgress()

        let fetchPromise = this._historyDownloadManager.fetch(Math.round(from), Math.round(to), MAX_FETCH_REQUESTS)
        return fetchPromise.then(function (history) {

            this.clearProgress()
            this.showHistory(history)

        }.bind(this)).catch(function (e) {

            if (e instanceof HistoryDownloadTooManyRequests) {
                let msg = gettext('Please choose a smaller interval of time!')
                Toast.error(msg)
                logger.warn('too many requests while downloading history')
                this.clearProgress()
            }
            else {
                logger.errorStack('history load failed', e)
                this.setError(e)
            }

        }.bind(this))
    }

    showHistory(history) {
        let data
        if (this._isBoolean) {
            data = history.map(sample => [sample.timestamp, sample.value ? 1 : 0])
        }
        else {
            data = history.map(sample => [sample.timestamp, sample.value])
        }

        this.setData(data)
    }

    makeBottom() {
        let bottomDiv = $('<div></div>', {class: 'ports-history-chart-page-bottom'})

        bottomDiv.append(this.makeNavigationDiv())

        return bottomDiv
    }

    makeNavigationDiv() {
        let navigDiv = $('<div></div>', {class: 'ports-history-chart-page-navigation'})

        let choices = TIME_WINDOW_CHOICES
        choices = choices.map(c => ({label: c.label.split('|'), value: c.value}))
        choices = choices.map(c => ({label: c.label[0], description: c.label[1], value: c.value}))
        if (Window.isSmallScreen()) {
            /* On small screens, divide choices on two rows */
            choices = [
                choices.slice(0, choices.length / 2),
                choices.slice(choices.length / 2)
            ]
        }

        this._timeWindowChoiceButtons = $('<div></div>', {class: 'ports-history-chart-time-window-choice-buttons'})
        this._timeWindowChoiceButtons.choicebuttons({
            choices: choices
        })
        this._timeWindowChoiceButtons.on('change', this.timeWindowToChart.bind(this))

        this._prevButton = $('<div></div>', {class: 'ports-history-chart-button ports-history-chart-prev-button'})
        this._nextButton = $('<div></div>', {class: 'ports-history-chart-button ports-history-chart-next-button'})

        this._prevButton.pushbutton({
            caption: '&#x25C0;'
        })
        this._prevButton.on('click', this.showPrevTimeWindow.bind(this))

        this._nextButton.pushbutton({
            caption: '&#x25B6;'
        })
        this._nextButton.on('click', this.showNextTimeWindow.bind(this))

        navigDiv.append(this._prevButton)
        navigDiv.append(this._timeWindowChoiceButtons)
        navigDiv.append(this._nextButton)

        return navigDiv
    }

    chartToTimeWindow() {
        let {min, max} = this.getXRange()
        let deltaSeconds = (max - min + 1) / 1000
        let value = null
        let choices = TIME_WINDOW_CHOICES.slice()
        choices.reverse()
        let choice = choices.find(c => c.value <= deltaSeconds)
        if (choice) {
            value = choice.value
        }

        this._timeWindowChoiceButtons.choicebuttons('setValue', value)
    }

    timeWindowToChart() {
        let deltaMilliseconds = this._timeWindowChoiceButtons.choicebuttons('getValue') * 1000
        let to = this.getXRange().max
        let from = to - deltaMilliseconds
        this.fetchAndShowHistory(from, to)
        this.setXRange(from, to)
    }

    showPrevTimeWindow() {
        let deltaMilliseconds = this._timeWindowChoiceButtons.choicebuttons('getValue') * 1000
        let to = this.getXRange().max - deltaMilliseconds
        let from = to - deltaMilliseconds
        this.fetchAndShowHistory(from, to)
        this.setXRange(from, to)
    }

    showNextTimeWindow() {
        let deltaMilliseconds = this._timeWindowChoiceButtons.choicebuttons('getValue') * 1000
        let from = this.getXRange().min + deltaMilliseconds
        let to = from + deltaMilliseconds
        if (to > new Date().getTime()) {
            /* There's no history in the future (or is there...?) */
            to = new Date().getTime()
            from = to - deltaMilliseconds
        }

        this.fetchAndShowHistory(from, to)
        this.setXRange(from, to)
    }

    makeOptionsBarContent() {
        return new PortHistoryChartPageOptionsForm({
            chartPage: this,
            enableSmooth: !this._isBoolean,
            enableFillArea: true,
            enableShowDataPoints: true,
            prefsPrefix: `ports.${this._port['id']}.history_chart`,
            defaults: {
                smooth: false,
                fillArea: false,
                showDataPoints: false
            }
        })
    }

}


export default PortHistoryChartPage
