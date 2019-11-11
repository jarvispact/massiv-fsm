'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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

const evaluateGuards = (transitionName, transitionData, context, fsmGuards) => {
    const guards = fsmGuards ? fsmGuards[transitionName] || [] : [];
    const guardResults = guards.map(guard => guard(context, transitionData));
    const guardsHaveErrors = guardResults.some(result => result instanceof Error);
    return { guardResults, guardsHaveErrors };
};

const getTransitionError = (transitionName, transitionData, guardResults) => {
    const error = new Error(`error in transition: "${transitionName}"`);
    error.transitionData = transitionData;
    error.guards = guardResults;
    return error;
};

const FSM = class {
    constructor(config) {
        validateConfig(config);

        const { initialState, transitions, context, contextReducer, guards } = config;
        this.initialState = initialState;
        this.transitions = transitions;
        this.context = context;
        this.state = initialState;
        this.contextReducer = contextReducer;
        this.guards = guards;
        this.subscribers = [];
    }

    on(name, fn) {
        this.subscribers.push({ name, fn });
    }

    async emit(name, data) {
        const subscribers = this.subscribers.filter(s => s.name === name).map(s => s.fn);
        const results = await Promise.all(subscribers.map(fn => fn(this.context, data)));
        return results;
    }

    reduceContext(name, transitionData) {
        return this.contextReducer
            ? this.contextReducer(this.context, { transition: name, data: transitionData })
            : this.context;
    }

    can(name, data) {
        const transition = this.transitions[name];
        if (!transition) throw new Error(`transition "${name}" was not specified`);
        const fromStatesAllowTransition = transition.from.includes(this.state);

        const newContext = this.reduceContext(name, data);
        const { guardsHaveErrors } = evaluateGuards(name, data, newContext, this.guards);

        return fromStatesAllowTransition && !guardsHaveErrors;
    }

    async transition(name, data) {
        const newContext = this.reduceContext(name, data);

        if (!this.can(name, data)) {
            const { guardResults, guardsHaveErrors } = evaluateGuards(name, data, newContext, this.guards);
            const error = guardsHaveErrors ? getTransitionError(name, data, guardResults) : undefined;

            return {
                previousState: this.state,
                newState: this.state,
                stateHasChanged: false,
                context: this.context,
                error,
            };
        }

        const { to } = this.transitions[name];
        const previousState = this.state;
        const newState = to === '*' ? previousState : to;
        const stateHasChanged = newState !== previousState;

        this.state = newState;
        this.context = newContext;

        const subscriberResults = await this.emit(name, data);

        return {
            previousState,
            newState,
            stateHasChanged,
            context: this.context,
            subscriberResults,
        };
    }
};

exports.FSM = FSM;
