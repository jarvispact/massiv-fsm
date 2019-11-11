const isObject = (val) => typeof val === 'object' && !Array.isArray(val);
const isFunction = (val) => typeof val === 'function';
const isValidTransition = (trans = {}) => Array.isArray(trans.from) && trans.from.length && typeof trans.to === 'string';

const validateConfig = (config) => {
    if (!config) throw new Error('config is missing in fsm constructor');

    const { initialState, transitions, context, contextReducer, guards } = config;
    if (!initialState) throw new Error('config.initialState is missing in fsm constructor');
    if (!transitions) throw new Error('config.transitions is missing in fsm constructor');

    if (!isObject(transitions)) throw new Error('config.transitions must be of type "object"');
    if (Object.keys(transitions).some(key => !isValidTransition(transitions[key]))) {
        throw new Error('config.transitions[index] has no "from" or "to" property');
    }

    if (context && !contextReducer) throw new Error('config.contextReducer is missing in fsm constructor');
    if (context && !isFunction(contextReducer)) throw new Error('config.contextReducer must be of type "function"');

    if (guards && !isObject(guards)) throw new Error('config.guards must be of type "object"');
    if (guards && Object.keys(guards).some(key => !Array.isArray(guards[key]))) {
        throw new Error('config.guards[index] is not of type "array"');
    }

    if (guards) {
        Object.keys(guards).forEach((key) => {
            guards[key].forEach((guard) => {
                if (!isFunction(guard)) throw new Error('config.guards[transitionName][index] is not of type "function"');
            });
        });
    }
};

export default validateConfig;
