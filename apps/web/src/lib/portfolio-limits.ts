// Portfolio 件数上限などの純粋な定数。
// server actions ファイル ('use server') は async 関数以外を export できないため、
// 定数はここに切り出して client/server 双方から import できるようにする。

export const FREE_PORTFOLIO_LIMIT = 10
