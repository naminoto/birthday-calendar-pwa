const noop = () => {};

// 正式build用。Viteのavatar-diagnostics modeだけが、このmoduleを独立テスト用実装へ差し替える。
export function setupAvatarPickerDiagnostics({ input } = {}) {
  return {
    enabled:false,
    pickerMode:input?.multiple ? 'multiple' : 'single',
    nextOperation:() => 0,
    fileRef:() => 0,
    record:noop,
    inputState:noop,
  };
}
