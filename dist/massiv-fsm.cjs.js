'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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
        this.initialState = config.initialState;
        this.context = config.context;
        this.state = config.initialState;
        this.states = config.states;
        this.contextReducer = config.contextReducer;
        this.guards = config.guards;
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
        const allowedTransitions = Object.keys(this.states[this.state].on);
        const fromStatesAllowTransition = allowedTransitions.includes(name);

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

        const to = this.states[this.state].on[name];
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
