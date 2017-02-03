import test from 'tape';
import sinon from 'sinon';
import maxwell from '../src/scripts'

test('xxx', t => {
  var cb = sinon.spy();
  maxwell.immediate(cb);
  t.plan(2);
  t.ok(cb.calledOnce, 'called once');
  t.ok(cb.calledWith('foo', 'bar'), 'arguments match expectation');
});
