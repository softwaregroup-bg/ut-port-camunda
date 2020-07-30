const fs = require('fs');

module.exports = function camunda() {
    return class camunda extends require('ut-port-http')(...arguments) {
        get defaults() {
            return {
                namespace: 'camunda',
                raw: {
                    json: true
                },
                openApi: {
                    camunda: require.resolve('./swagger')
                },
                host: 'camunda.k8s.softwaregroup-bg.com',
                basePath: '/engine-rest/engine/default'
            };
        }

        init() {
            try {
                if (
                    typeof this.config.openApi.camunda === 'string' &&
                    !this.config.openApi.camunda.startsWith('http')
                ) {
                    const apiJson = JSON.parse(
                        fs.readFileSync(this.config.openApi.camunda, 'utf-8')
                    );
                    if (apiJson.swagger) {
                        apiJson.host = this.config.host;
                        apiJson.basePath = this.config.basePath;
                        this.config.openApi.camunda = apiJson;
                    }
                }
            } catch (e) {}
            return super.init(...arguments);
        }

        handlers() {
            return {
                receive: (response, {mtid}) => {
                    if (mtid === 'error') return response.body;
                    return response.payload;
                },
                send: params => ({
                    ...params, body: params
                }),
                'camunda.task.fail.request.send': ({id, ...rest}) => ({
                    id,
                    parseResponse: false,
                    body: rest
                }),
                'camunda.task.complete.request.send': ({id, ...rest}) => ({
                    id,
                    parseResponse: false,
                    body: rest
                }),
                'camunda.process.start.request.send': ({process, ...rest}) => {
                    const variables = Object.entries(rest).reduce((prev, [name, value]) => {
                        prev[name] = typeof value === 'object' ? {value: JSON.stringify(value)} : {value};
                        return prev;
                    }, {});

                    return {
                        key: process,
                        body: {
                            variables
                        }
                    };
                },
                'camunda.variables.get.response.receive': (response, {mtid}) => {
                    if (mtid === 'error') return response.body;
                    return response.payload && Object.entries(response.payload).reduce((prev, [name, value]) => {
                        try {
                            const actualValue = JSON.parse(value.value);
                            prev[name] = typeof actualValue === 'object' ? actualValue : value.value;
                            return prev;
                        } catch (e) {
                            prev[name] = value.value;
                            return prev;
                        }
                    }, {});
                }
            };
        }
    };
};
