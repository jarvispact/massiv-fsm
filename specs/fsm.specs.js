/* eslint-disable no-unused-expressions */
import { expect } from 'chai';
import FSM from '../src/fsm';
import { createTrafficLightMachine, createVendorMachine, createFormMachine, sleep } from './helper';

describe('FSM', () => {
    describe('trafficlight machine', () => {
        describe('in state: "red" the "can" function', () => {
            it('should return false for transition "RED"', () => {
                expect(createTrafficLightMachine('red').can('RED')).to.equal(false);
            });

            it('should return false for transition "YELLOW"', () => {
                expect(createTrafficLightMachine('red').can('YELLOW')).to.equal(false);
            });

            it('should return false for transition "GREEN"', () => {
                expect(createTrafficLightMachine('red').can('GREEN')).to.equal(true);
            });
        });

        describe('in state: "yellow" the "can" function', () => {
            it('should return false for transition "RED"', () => {
                expect(createTrafficLightMachine('yellow').can('RED')).to.equal(true);
            });

            it('should return false for transition "YELLOW"', () => {
                expect(createTrafficLightMachine('yellow').can('YELLOW')).to.equal(false);
            });

            it('should return false for transition "GREEN"', () => {
                expect(createTrafficLightMachine('yellow').can('GREEN')).to.equal(false);
            });
        });

        describe('in state: "green" the "can" function', () => {
            it('should return false for transition "RED"', () => {
                expect(createTrafficLightMachine('green').can('RED')).to.equal(false);
            });

            it('should return false for transition "YELLOW"', () => {
                expect(createTrafficLightMachine('green').can('YELLOW')).to.equal(true);
            });

            it('should return false for transition "GREEN"', () => {
                expect(createTrafficLightMachine('green').can('GREEN')).to.equal(false);
            });
        });
    });

    describe('vendor machine', () => {
        describe('in state: "idle" the "can" function', () => {
            it('should return true for transition "INSERTMONEY"', () => {
                expect(createVendorMachine('idle').can('INSERTMONEY', { money: 1 })).to.equal(true);
            });

            it('should return false for transition "BUY"', () => {
                expect(createVendorMachine('idle').can('BUY')).to.equal(false);
            });
        });

        describe('in state: "buying" the "can" function', () => {
            it('should return true for transition "BUY" if guard is satisfied', () => {
                expect(createVendorMachine('buying', { credit: 1 }).can('BUY')).to.equal(true);
            });

            it('should return false for transition "BUY" if guard is not satisfied', () => {
                expect(createVendorMachine('buying', { credit: 0 }).can('BUY')).to.equal(false);
            });
        });

        describe('context accumulation and guard evaluation', () => {
            it('should accumulate the context and evaluate the guards', () => {
                const fsm = createVendorMachine('idle', { credit: 0 });

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

    describe('form machine', () => {
        it('should call the side effects of a transition', (done) => {
            const fsm = createFormMachine('idle');

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
