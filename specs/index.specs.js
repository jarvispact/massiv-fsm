import { expect } from 'chai';
import test from '../src/index';

describe('test', () => {
    it('should run tests without error', () => {
        expect(test()).to.equal('Hello World');
    });
});
