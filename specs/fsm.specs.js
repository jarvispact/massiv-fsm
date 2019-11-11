/* eslint-disable no-unused-expressions, one-var-declaration-per-line */
import 'core-js/stable';
import 'regenerator-runtime/runtime';

import { expect } from 'chai';
import FSM from '../src/fsm';
import { createTrafficLightMachine, createVendorMachine, createFormMachine, sleep, createSimpleMachine } from './helper';

describe('FSM', () => {
    describe('config validation in constructor', () => {
        it('should throw an validation error if "config" was not provided', () => {
            expect(() => new FSM()).to.throw(/config is missing in fsm constructor/);
        });

        it('should throw an validation error if "config.initialState" was not provided', () => {
            expect(() => new FSM({})).to.throw(/config.initialState is missing in fsm constructor/);
        });

        it('should throw an validation error if "config.transitions" was not provided', () => {
            const fsm = () => new FSM({ initialState: 'initialState' });
            expect(fsm).to.throw(/config.transitions is missing in fsm constructor/);
        });

        it('should throw an validation error if "config.transitions" has a invalid type', () => {
            const fsm = () => new FSM({ initialState: 'initialState', transitions: 42 });
            expect(fsm).to.throw(/config.transitions must be of type "object"/);
        });

        it('should throw an validation error if "config.transitions" is a array', () => {
            const fsm = () => new FSM({ initialState: 'initialState', transitions: [] });
            expect(fsm).to.throw(/config.transitions must be of type "object"/);
        });

        it('should throw an validation error if a transition in "config.transitions" has no "from"', () => {
            const transitions = { ONE: { from: ['two'], to: 'one' }, TWO: { to: 'two' } };
            const fsm = () => new FSM({ initialState: 'initialState', transitions });
            expect(fsm).to.throw(/config.transitions\[index\] has no "from" or "to" property/);
        });

        it('should throw an validation error if a transition in "config.transitions" has no "to"', () => {
            const transitions = { ONE: { from: ['two'], to: 'one' }, TWO: { from: ['one'] } };
            const fsm = () => new FSM({ initialState: 'initialState', transitions });
            expect(fsm).to.throw(/config.transitions\[index\] has no "from" or "to" property/);
        });

        it('should throw an validation error if a transition in "config.transitions" has no a empty "from"', () => {
            const transitions = { ONE: { from: ['two'], to: 'one' }, TWO: { from: [], to: 'two' } };
            const fsm = () => new FSM({ initialState: 'initialState', transitions });
            expect(fsm).to.throw(/config.transitions\[index\] has no "from" or "to" property/);
        });

        it('should throw an validation error if "config.context" was provided but no "config.contextReducer" was provided', () => {
            const fsm = () => new FSM({ initialState: 'initialState', transitions: {}, context: {} });
            expect(fsm).to.throw(/config.contextReducer is missing in fsm constructor/);
        });

        it('should throw an validation error if "config.contextReducer" is not a function', () => {
            const fsm = () => new FSM({ initialState: 'initialState', transitions: {}, context: {}, contextReducer: {} });
            expect(fsm).to.throw(/config.contextReducer must be of type "function"/);
        });

        it('should throw an validation error if "config.guards" has a invalid type', () => {
            const fsm = () => new FSM({ initialState: 'initialState', transitions: {}, guards: 42 });
            expect(fsm).to.throw(/config.guards must be of type "object"/);
        });

        it('should throw an validation error if "config.guards" is a array', () => {
            const fsm = () => new FSM({ initialState: 'initialState', transitions: {}, guards: [] });
            expect(fsm).to.throw(/config.guards must be of type "object"/);
        });

        it('should throw an validation error if a guard in "config.guards[transitionName]" is no array', () => {
            const guards = { ONE: [], TWO: {} };
            const fsm = () => new FSM({ initialState: 'initialState', transitions: {}, guards });
            expect(fsm).to.throw(/config.guards\[index\] is not of type "array"/);
        });

        it('should throw an validation error if a guard in "config.guards[transitionName][index]" is no function', () => {
            const guards = { ONE: [], TWO: [{}] };
            const fsm = () => new FSM({ initialState: 'initialState', transitions: {}, guards });
            expect(fsm).to.throw(/config.guards\[transitionName\]\[index\] is not of type "function"/);
        });
    });

    describe('fsm event handling', () => {
        it('should call the subscribers on a transition where the from states match', async () => {
            const fsm = createSimpleMachine({ initialState: 'one' });
            let fn1 = false; let fn2 = false; let fn3 = false;
            fsm.on('TWO', async () => { await sleep(100); fn1 = true; });
            fsm.on('TWO', async () => { await sleep(100); fn2 = true; });
            fsm.on('TWO', async () => { await sleep(100); fn3 = true; });
            await fsm.transition('TWO');
            expect(fn1).to.equal(true);
            expect(fn2).to.equal(true);
            expect(fn3).to.equal(true);
        });

        it('should not call the subscribers on a transition where from states do not match', async () => {
            const fsm = createSimpleMachine({ initialState: 'two' });
            let fn1 = false; let fn2 = false; let fn3 = false;
            fsm.on('THREE', async () => { await sleep(100); fn1 = true; });
            fsm.on('THREE', async () => { await sleep(100); fn2 = true; });
            fsm.on('THREE', async () => { await sleep(100); fn3 = true; });
            await fsm.transition('THREE');
            expect(fn1).to.equal(false);
            expect(fn2).to.equal(false);
            expect(fn3).to.equal(false);
        });

        it('should not call the subscribers on a transition where the from states match but a guard is not satisfied', async () => {
            const guards = { TWO: [() => true, () => new Error('guard')] };
            const fsm = createSimpleMachine({ initialState: 'one', guards });
            let fn1 = false; let fn2 = false; let fn3 = false;
            fsm.on('TWO', async () => { await sleep(100); fn1 = true; });
            fsm.on('TWO', async () => { await sleep(100); fn2 = true; });
            fsm.on('TWO', async () => { await sleep(100); fn3 = true; });
            await fsm.transition('TWO');
            expect(fn1).to.equal(false);
            expect(fn2).to.equal(false);
            expect(fn3).to.equal(false);
        });
    });

    describe('context and contextReducer', () => {
        const contextReducer = (context, { transition, data }) => {
            switch (transition) {
            case 'TWO':
                return { ...context, answer: context.answer + data };
            case 'THREE':
                return { ...context, answer: context.answer + data };
            default:
                return context;
            }
        };

        it('should update the context with the given contextReducer on a successful transition', async () => {
            const fsm = createSimpleMachine({ initialState: 'one', context: { answer: 40 }, contextReducer });
            const transitionResult = await fsm.transition('TWO', 2);
            expect(transitionResult.context).to.eql({ answer: 42 });
        });

        it('should not update the context when the transition does not satisfy the "from" states', async () => {
            const fsm = createSimpleMachine({ initialState: 'two', context: { answer: 39 }, contextReducer });
            const transitionResult = await fsm.transition('THREE', 2);
            expect(transitionResult.context).to.eql({ answer: 39 });
        });

        it('should not update the context when the transition satisfies the "from" states but a guard is not satisfied', async () => {
            const guards = { TWO: [() => true, () => new Error('guard')] };
            const fsm = createSimpleMachine({ initialState: 'one', context: { answer: 40 }, contextReducer, guards });
            const transitionResult = await fsm.transition('TWO', 2);
            expect(transitionResult.context).to.eql({ answer: 40 });
        });
    });

    describe('fsm.can', () => {
        it('should return true when the transition satisfies the from states', () => {
            const fsm = createSimpleMachine({ initialState: 'one' });
            expect(fsm.can('TWO')).to.equal(true);
            expect(fsm.can('THREE')).to.equal(true);
        });

        it('should return false when the transition does not satisfy the from states', () => {
            const fsm = createSimpleMachine({ initialState: 'one' });
            expect(fsm.can('ONE')).to.equal(false);
        });

        it('should return false when the transition satisfies the from states but a guard is not satisfied', () => {
            const guards = { TWO: [() => true, () => new Error('guard')] };
            const fsm = createSimpleMachine({ initialState: 'one', guards });
            expect(fsm.can('TWO')).to.equal(false);
        });
    });

    describe('fsm.transition', () => {
        it('should return true when the transition satisfies the from states', async () => {
            const fsm = createSimpleMachine({ initialState: 'one' });
            const { previousState, newState, stateHasChanged } = await fsm.transition('TWO');
            expect(previousState).to.equal('one');
            expect(newState).to.equal('two');
            expect(stateHasChanged).to.equal(true);
        });

        it('should return false when the transition does not satisfy the from states', async () => {
            const fsm = createSimpleMachine({ initialState: 'one' });
            const { previousState, newState, stateHasChanged } = await fsm.transition('ONE');
            expect(previousState).to.equal('one');
            expect(newState).to.equal('one');
            expect(stateHasChanged).to.equal(false);
        });

        it('should return false when the transition satisfies the from states but a guard is not satisfied', async () => {
            const guards = { TWO: [() => true, () => new Error('guard')] };
            const fsm = createSimpleMachine({ initialState: 'one', guards });
            const { previousState, newState, stateHasChanged } = await fsm.transition('TWO');
            expect(previousState).to.equal('one');
            expect(newState).to.equal('one');
            expect(stateHasChanged).to.equal(false);
        });
    });
});
