export async function withTransactionLock<T>(run: () => Promise<T>): Promise<T> {
  if (!navigator.locks) throw new Error('取引の安全な保存にはWeb Locks対応ブラウザとHTTPS（またはlocalhost）が必要です。');
  return navigator.locks.request('nftlab-devnet-transaction', { ifAvailable: true }, async lock => {
    if (!lock) throw new Error('別のタブで取引を処理しています。完了後に取引状況を再確認してください。');
    return run();
  });
}
