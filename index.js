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
                }
            };
        }

        handlers() {
            return {
                receive: response => {
                    if (response.code !== 200) return response.body;
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
                'camunda.variables.get.request.receive': response => {
                    if (response.code !== 200) return response.body;
                    return response.body.payload && Object.entries(response.body.payload).reduce((prev, [name, value]) => {
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
