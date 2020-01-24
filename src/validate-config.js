const isObject = (val) => typeof val === 'object' && !Array.isArray(val);
const isString = (val) => typeof val === 'string';
const isFunction = (val) => typeof val === 'function';
const isValidState = (state = {}) => state && isObject(state.on) && Object.keys(state.on).every(key => isString(state.on[key]));

const validateConfig = (config) => {
    if (!config) throw new Error('config is missing in fsm constructor');

    const { initialState, states, context, contextReducer, guards } = config;
    if (!initialState) throw new Error('config.initialState is missing in fsm constructor');
    if (!states) throw new Error('config.states is missing in fsm constructor');

    if (!isObject(states)) throw new Error('config.states must be of type "object"');
    if (Object.keys(states).some(key => !isValidState(states[key]))) {
        throw new Error('config.states[index] has a invalid format');
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
