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
});
