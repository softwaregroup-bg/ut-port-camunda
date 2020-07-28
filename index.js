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
                    return response.payload;
                },
                send: params => {
                    return {body: params};
                },
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
                }
            };
        }
    };
};
