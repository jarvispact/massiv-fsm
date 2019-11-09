/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import FSM from '../src/fsm';

describe('FSM', () => {
    describe('traffic light', () => {
        const createTrafficLight = (initialState) => new FSM({
            initialState,
            transitions: {
                GREEN: {
                    from: ['red'],
                    to: 'green',
                },
                YELLOW: {
                    from: ['green'],
                    to: 'yellow',
                },
                RED: {
                    from: ['yellow'],
                    to: 'red',
                },
            },
        });

        describe('in state: "red" the "can" function', () => {
            it('should return false for transition "RED"', () => {
                expect(createTrafficLight('red').can('RED')).to.equal(false);
            });

            it('should return false for transition "YELLOW"', () => {
                expect(createTrafficLight('red').can('YELLOW')).to.equal(false);
            });

            it('should return false for transition "GREEN"', () => {
                expect(createTrafficLight('red').can('GREEN')).to.equal(true);
            });
        });

        describe('in state: "yellow" the "can" function', () => {
            it('should return false for transition "RED"', () => {
                expect(createTrafficLight('yellow').can('RED')).to.equal(true);
            });

            it('should return false for transition "YELLOW"', () => {
                expect(createTrafficLight('yellow').can('YELLOW')).to.equal(false);
            });

            it('should return false for transition "GREEN"', () => {
                expect(createTrafficLight('yellow').can('GREEN')).to.equal(false);
            });
        });

        describe('in state: "green" the "can" function', () => {
            it('should return false for transition "RED"', () => {
                expect(createTrafficLight('green').can('RED')).to.equal(false);
            });

            it('should return false for transition "YELLOW"', () => {
                expect(createTrafficLight('green').can('YELLOW')).to.equal(true);
            });

            it('should return false for transition "GREEN"', () => {
                expect(createTrafficLight('green').can('GREEN')).to.equal(false);
            });
        });
    });

    describe('vending machine', () => {
        const initialContext = { credit: 0 };

        const contextReducer = (currentContext = initialContext, { transition, data }) => {
            switch (transition) {
            case 'INSERTMONEY':
                return { ...currentContext, credit: currentContext.credit + data.money };
            default:
                return currentContext;
            }
        };

        const passIfCreditIs1OrHigher = (context = {}) => {
            if (context.credit >= 1) return true;
            return new Error('you have not enough credit');
        };

        const createVendingMachine = (initialState, context, guards) => new FSM({
            initialState,
            transitions: {
                INSERTMONEY: {
                    from: ['idle', 'buying'],
                    to: 'buying',
                },
                RESET: {
                    from: ['idle', 'buying'],
                    to: 'idle',
                },
                BUY: {
                    from: ['buying'],
                    to: 'idle',
                },
            },
            context,
            contextReducer,
            guards,
        });

        describe('in state: "idle" the "can" function', () => {
            it('should return true for transition "INSERTMONEY"', () => {
                expect(createVendingMachine('idle').can('INSERTMONEY', { money: 1 })).to.equal(true);
            });

            it('should return false for transition "BUY"', () => {
                expect(createVendingMachine('idle').can('BUY')).to.equal(false);
            });
        });

        describe('in state: "buying" the "can" function', () => {
            it('should return true for transition "BUY" if guard is satisfied', () => {
                const guards = { BUY: [passIfCreditIs1OrHigher] };
                expect(createVendingMachine('buying', { credit: 1 }, guards).can('BUY')).to.equal(true);
            });

            it('should return false for transition "BUY" if guard is not satisfied', () => {
                const guards = { BUY: [passIfCreditIs1OrHigher] };
                expect(createVendingMachine('buying', { credit: 0 }, guards).can('BUY')).to.equal(false);
            });
        });

        describe('context accumulation and guard evaluation', () => {
            it('should accumulate the context and evaluate the guards', () => {
                const guards = { BUY: [passIfCreditIs1OrHigher] };
                const fsm = createVendingMachine('idle', { credit: 0 }, guards);

                const insertMoney1 = fsm.transition('INSERTMONEY', { money: 0.4 });
                expect(insertMoney1.stateHasChanged).to.equal(true);
                expect(insertMoney1.newState).to.equal('buying');
                expect(insertMoney1.context).to.eql({ credit: 0.4 });

                const buy1 = fsm.transition('BUY');
                expect(buy1.stateHasChanged).to.equal(false);
                expect(buy1.newState).to.equal(insertMoney1.newState);
                expect(buy1.context).to.eql(insertMoney1.context);
                expect(buy1.error.guards).to.have.lengthOf(1);
                expect(buy1.error.guards[0].message).to.equal('you have not enough credit');


                const insertMoney2 = fsm.transition('INSERTMONEY', { money: 0.4 });
                expect(insertMoney2.stateHasChanged).to.equal(false);
                expect(insertMoney2.newState).to.equal('buying');
                expect(insertMoney2.context).to.eql({ credit: 0.8 });

                const buy2 = fsm.transition('BUY');
                expect(buy2.stateHasChanged).to.equal(false);
                expect(buy2.newState).to.equal(insertMoney2.newState);
                expect(buy2.context).to.eql(insertMoney2.context);
                expect(buy2.error.guards).to.have.lengthOf(1);
                expect(buy2.error.guards[0].message).to.equal('you have not enough credit');


                const insertMoney3 = fsm.transition('INSERTMONEY', { money: 0.2 });
                expect(insertMoney3.stateHasChanged).to.equal(false);
                expect(insertMoney3.newState).to.equal('buying');
                expect(insertMoney3.context).to.eql({ credit: 1 });

                const buy3 = fsm.transition('BUY');
                expect(buy3.stateHasChanged).to.equal(true);
                expect(buy3.newState).to.equal('idle');
                expect(buy3.context).to.eql(insertMoney3.context);
                expect(buy3.error).to.be.undefined;
            });
        });
    });

    describe('form handling', () => {
        const initialContext = {
            values: { email: '', password: '' },
            warnings: { email: '', password: '' },
            errors: { email: '', password: '' },
            validateOnChange: true,
            validateOnBlur: true,
        };

        const validate = ({ email, password }) => {
            const warnings = { email: '', password: '' };
            const errors = { email: '', password: '' };

            if (!email) errors.email = 'email is required';
            if (!password) errors.password = 'password is required';
            if (password && password.length < 5) warnings.password = 'password needs at least 5 characters';

            return { warnings, errors };
        };

        const reduceValues = (values, { name, value }) => ({ ...values, [name]: value });

        const contextReducer = (currentContext = initialContext, { transition, data }) => {
            switch (transition) {
            case 'CHANGE':
                return {
                    ...currentContext,
                    values: reduceValues(currentContext.values, data),
                    warnings: currentContext.validateOnChange ? {
                        ...currentContext.warnings,
                        [data.name]: validate(reduceValues(currentContext.values, data)).warnings[data.name],
                    } : currentContext.warnings,
                    errors: currentContext.validateOnChange ? {
                        ...currentContext.errors,
                        [data.name]: validate(reduceValues(currentContext.values, data)).errors[data.name],
                    } : currentContext.errors,
                };
            case 'BLUR':
                return {
                    ...currentContext,
                    warnings: currentContext.validateOnBlur ? {
                        ...currentContext.warnings,
                        [data.name]: validate(currentContext.values).warnings[data.name],
                    } : currentContext.warnings,
                    errors: currentContext.validateOnBlur ? {
                        ...currentContext.errors,
                        [data.name]: validate(currentContext.values).errors[data.name],
                    } : currentContext.errors,
                };
            default:
                return currentContext;
            }
        };

        const submitDisabledGuard = (context) => {
            const hasErrors = Object.values(context.errors).filter(Boolean).length > 0;
            if (hasErrors) return new Error('submit disabled');
            return true;
        };

        const createFormFSM = (initialState, context) => new FSM({
            initialState,
            transitions: {
                CHANGE: {
                    from: ['idle'],
                    to: '*',
                },
                BLUR: {
                    from: ['idle'],
                    to: '*',
                },
                SUBMIT: {
                    from: ['idle'],
                    to: 'submitting',
                },
                RESUBMIT: {
                    from: ['submit-resolved', 'submit-rejected'],
                    to: 'submitting',
                },
                SUBMIT_RESOLVE: {
                    from: ['submitting'],
                    to: 'submit-resolved',
                },
                SUBMIT_REJECT: {
                    from: ['submitting'],
                    to: 'submit-rejected',
                },
            },
            context,
            contextReducer,
            guards: { SUBMIT: [submitDisabledGuard] },
        });

        const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

        it('should call the side effects of a transition', (done) => {
            const fsm = createFormFSM('idle', initialContext);

            fsm.on('SUBMIT', () => {
                sleep(100).then(() => {
                    fsm.transition('SUBMIT_RESOLVE', { response: 'hello world' });
                });
            });

            const change1 = fsm.transition('CHANGE', { name: 'email', value: '' });
            expect(change1.previousState).to.equal('idle');
            expect(change1.newState).to.equal('idle');
            expect(change1.stateHasChanged).to.equal(false);
            expect(change1.context.values.email).to.equal('');
            expect(change1.context.errors.email).to.equal('email is required');

            const change2 = fsm.transition('CHANGE', { name: 'password', value: '' });
            expect(change2.previousState).to.equal('idle');
            expect(change2.newState).to.equal('idle');
            expect(change2.stateHasChanged).to.equal(false);
            expect(change2.context.values.password).to.equal('');
            expect(change2.context.errors.password).to.equal('password is required');

            const canSubmit = fsm.can('SUBMIT');
            expect(canSubmit).to.equal(false);

            const change3 = fsm.transition('CHANGE', { name: 'email', value: 'test@test.com' });
            expect(change3.previousState).to.equal('idle');
            expect(change3.newState).to.equal('idle');
            expect(change3.stateHasChanged).to.equal(false);
            expect(change3.context.values.email).to.equal('test@test.com');
            expect(change3.context.errors.email).to.equal('');

            const canSubmit2 = fsm.can('SUBMIT');
            expect(canSubmit2).to.equal(false);

            const change4 = fsm.transition('CHANGE', { name: 'password', value: '1234' });
            expect(change4.previousState).to.equal('idle');
            expect(change4.newState).to.equal('idle');
            expect(change4.stateHasChanged).to.equal(false);
            expect(change4.context.values.password).to.equal('1234');
            expect(change4.context.warnings.password).to.equal('password needs at least 5 characters');
            expect(change4.context.errors.password).to.equal('');

            const canSubmit3 = fsm.can('SUBMIT');
            expect(canSubmit3).to.equal(true);

            const change5 = fsm.transition('CHANGE', { name: 'password', value: '12345' });
            expect(change5.previousState).to.equal('idle');
            expect(change5.newState).to.equal('idle');
            expect(change5.stateHasChanged).to.equal(false);
            expect(change5.context.values.password).to.equal('12345');
            expect(change5.context.warnings.password).to.equal('');
            expect(change5.context.errors.password).to.equal('');

            const canSubmit4 = fsm.can('SUBMIT');
            expect(canSubmit4).to.equal(true);

            const submitResult = fsm.transition('SUBMIT');
            expect(submitResult.previousState).to.equal('idle');
            expect(submitResult.newState).to.equal('submitting');
            expect(submitResult.stateHasChanged).to.equal(true);
            expect(submitResult.context.values).to.eql({ email: 'test@test.com', password: '12345' });

            sleep(500).then(() => {
                expect(fsm.state).to.equal('submit-resolved');
                done();
            });
        });
    });
});
