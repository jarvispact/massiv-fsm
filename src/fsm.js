import validateConfig from './validate-config';
import evaluateGuards from './evaluate-guards';
import getTransitionError from './get-transition-error';

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

export default FSM;
