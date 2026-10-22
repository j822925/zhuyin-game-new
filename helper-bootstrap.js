import {helperLaunchEnvironment, helperLaunchPlan, mountHelperLaunch, showHelperReturnHint} from './helper-launch.js?v=20261022-audio1';

const plan = helperLaunchPlan(location.href, helperLaunchEnvironment());
if (plan.standalone) {
  // Do not load or start speech recognition inside an installed Apple web app.
  // Both helper panels open together in a normal Safari tab after the tap.
  mountHelperLaunch(plan);
} else {
  if (new URL(location.href).searchParams.get('source') === 'homescreen-helper') showHelperReturnHint();
  try { await import('./zhuyin-helper.js?v=20261022-audio1'); }
  catch {
    document.getElementById('mic-status').textContent = '小幫手還沒載入完成，請重新整理。';
    const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '重新載入';
    retry.onclick = () => location.reload();
    document.getElementById('mic-status').after(retry);
  }
}
