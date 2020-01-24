import FSM from '../src/fsm';

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export const createSimpleMachine = ({ initialState, context, contextReducer, guards }) => new FSM({
    initialState,
    states: {
        one: {
            on: {
                TWO: 'two',
                THREE: 'three',
            },
        },
        two: {
            on: {
                ONE: 'one',
            },
        },
        three: {
            on: {
                ONE: 'one',
                THEE: 'three',
            },
        },
    },
    context,
    contextReducer,
    guards,
});
