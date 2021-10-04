const parseInternalVariables = variables => variables && Object.entries(variables).reduce((prev, [name, value]) => {
    prev[name] = parseInternal(value);
    return prev;
}, {});

const parseInternal = value => {
    try {
        const actualValue = JSON.parse(value.value);
        return typeof actualValue === 'object' ? actualValue : value.value;
    } catch (e) {
        return value.value;
    }
};

const parseExternalVariables = variables => Object.entries(variables).reduce((prev, [key, value]) => {
    prev[key] = parseExternalVariable(value);
    return prev;
}, {});

const parseExternalVariable = variableValue => {
    const variableType = typeof variableValue;
    // map js type to java class type
    switch (variableType) {
        case 'string':
            return {
                value: variableValue,
                type: 'String'
            };

        case 'bigint':
        case 'symbol':
            return {
                value: variableValue.toString(),
                type: 'String'
            };

        case 'number':
            if (Number.isInteger(variableValue)) {
                return {
                    value: variableValue,
                    type: 'Integer'
                };
            }
            return {
                value: variableValue,
                type: 'Double'
            };

        case 'boolean':
            return {
                value: variableValue,
                type: 'Boolean'
            };

        case 'object':
            return {
                value: JSON.stringify(variableValue),
                type: 'String'
            };

        default:
            // undefined/function
            return {
                value: null,
                type: 'String'
            };
    }
};

module.exports = function camunda() {
    return class camunda extends require('ut-port-http')(...arguments) {
        get defaults() {
            return {
                namespace: 'camunda',
                raw: {
                    json: true
                },
                openApi: {
                    camunda: [require.resolve('./swagger')]
                },
                mergeOptions: {
                    mergeStrategies: {
                        'openApi.camunda': 'combine'
                    }
                }
            };
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
                'camunda.process.start.request.send': ({process, ...variables}) => {
                    return {
                        key: process,
                        body: {
                            variables: parseExternalVariables(variables)
                        }
                    };
                },
                'camunda.variables.get.response.receive': (response, {mtid}) => {
                    if (mtid === 'error') return response.body;
                    return parseInternalVariables(response.payload);
                },

                'camunda.external.fetch.response.receive': (response, {mtid}) => {
                    if (mtid === 'error') return response.body;
                    if (!Array.isArray(response.payload)) {
                        return response.payload;
                    }
                    return response.payload.map(task => ({...task, variables: parseInternalVariables(task.variables)}));
                },
                'camunda.externaltask.complete.request.send': ({ id, workerId, variables = {} }) => {
                    return {
                        id: id,
                        parseResponse: false,
                        body: {
                            workerId: workerId,
                            variables: parseExternalVariables(variables)
                        }
                    };
                },
                'camunda.task.complete.request.send': ({id, variables = {}}) => {
                    return {
                        id,
                        parseResponse: false,
                        body: {
                            variables: parseExternalVariables(variables)
                        }
                    };
                },
                'camunda.task.claim.request.send': ({id, ...rest}) => ({
                    id,
                    parseResponse: false,
                    body: rest
                }),
                'camunda.task.unclaim.request.send': ({id}) => ({
                    id,
                    parseResponse: false
                }),
                'camunda.task.fail.request.send': ({id, ...rest}) => ({
                    id,
                    parseResponse: false,
                    body: rest
                })
            };
        }
    };
};
