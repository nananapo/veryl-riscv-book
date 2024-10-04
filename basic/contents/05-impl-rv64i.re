= RV64Iの実装

これまでに、RISC-Vの32ビットの基本整数命令セットであるRV32IのCPUを実装しました。
RISC-Vには64ビットの基本整数命令セットとしてRV64Iが定義されています。
本章では、RV32IのCPUをRV64Iにアップグレードします。

では、具体的にRV32IとRV64Iは何が違うのでしょうか?

まず、RV64IではXLENが32ビットから64ビットに変更され、レジスタの幅や各種演算命令の演算の幅が64ビットになります。
それに伴い、
32ビット幅での演算を行う命令、
64ビット幅でロードストアを行う命令が追加されます(@<table>{rv64i.new_insts})。
また、演算の幅が64ビットに広がるだけではなく、
動作が少し変わる命令が存在します(@<table>{rv64i.change})。

//table[rv64i.new_insts][RV64Iで追加される命令]{
命令	動作
-------------------------------------------------------------
ADD[I]W	32ビット単位で加算を行う。結果は符号拡張する
SUBW	32ビット単位で減算を行う。結果は符号拡張する
SLL[I]W	レジスタの値を0 ~ 31ビット左論理シフトする。結果は符号拡張する
SRL[I]W	レジスタの値を0 ~ 31ビット右論理シフトする。結果は符号拡張する
SRA[I]W	レジスタの値を0 ~ 31ビット右算術シフトする。結果は符号拡張する
LWU		メモリから32ビット読み込む。結果はゼロで拡張する
LD		メモリから64ビット読み込む
SD		メモリに64ビット書き込む
//}

//table[rv64i.change][RV64Iで変更される命令]{
命令	動作
-------------------------------------------------------------
SLL[I]	0 ~ 63ビット左論理シフトする
SRL[I]	0 ~ 63ビット右論理シフトする
SRA[I]	0 ~ 63ビット右算術シフトする
LUI		32ビットの即値を生成する。結果は符号拡張する
AUIPC	32ビットの即値を符号拡張したものにpcを足し合わせる
LW		メモリから32ビット読み込む。結果は符号拡張する
//}

実装のテストにはriscv-testsを利用します。
RV64I向けのテストは@<code>{rv64i-p-}から始まるテストです。
命令を実装するたびにテストを実行することで、命令が正しく実行できていることを確認します。

== XLENを変更する

eeiパッケージに定義しているXLENを64に変更します。
RV64Iになっても命令の幅(@<code>{ILEN})は32ビットのままです。

//list[xlen.change][XLENを変更する (eei.veryl)]{
#@maprange(scripts/05/xlen-shift-range/core/src/eei.veryl,xlen)
    const XLEN: u32 = @<b>|64|;
#@end
//}

=== SLL[I], SRL[I], SRA[I]命令の対応

RV32Iでは、シフト命令はrs1の値を0 ~ 31ビットシフトする命令として定義されています。
これが、RV64Iでは、rs1の値を0 ~ 64ビットシフトする命令に変更されます。

これに対応するために、ALUのシフト演算する量を5ビットから6ビットに変更します。

//list[shift.change][シフト命令でシフトする量を変更する (alu.veryl)]{
#@maprange(scripts/05/xlen-shift-range/core/src/alu.veryl,shift)
    let sll: UIntX = op1 << op2[@<b>|5|:0];
    let srl: UIntX = op1 >> op2[@<b>|5|:0];
    let sra: SIntX = $signed(op1) >>> op2[@<b>|5|:0];
#@end
//}

I形式の命令(SLLI, SRLI, SRAI)のときは即値、
R形式の命令(SLL, SRL, SRA)のときはレジスタの下位6ビットが利用されるようになります。

=== LUI, AUIPC命令の対応

RV32Iでは、LUI命令は32ビットの即値をそのまま保存する命令として定義されています。
これが、RV64Iでは、32ビットの即値を64ビットに符号拡張した値を保存する命令に変更されます。
AUIPC命令も同様で、即値にPCを足す前に、即値を64ビットに符号拡張します。

この対応ですが、XLENを64に変更した時点ですでに完了しています。
よって、コードの変更の必要はありません。

//list[imm.not.change][U形式の即値はXLENビットに拡張されている (inst_decoder.veryl)]{
#@maprange(scripts/05/xlen-shift-range/core/src/inst_decoder.veryl,imm)
    let imm_u: UIntX = {bits[31] repeat XLEN - $bits(imm_u_g) - 12, imm_u_g, 12'b0};
#@end
//}

=== CSRの対応

MXLEN(=XLEN)が64ビットに変更されると、CSRの幅も64ビットに変更されます。
そのため、mtvec, mepc, mcauseレジスタの幅を64ビットに変更する必要があります。

しかし、mtvec, mepc, mcauseレジスタは
XLENビットのレジスタ(@<code>{UIntX})として定義しているため、
変更の必要はありません。
また、mtvec, mepc, mcauseレジスタはMXLENを基準に定義されており、
RV32IからRV64Iに変わってもフィールドに変化はないため、対応は必要ありません。

唯一、書き込みマスクの幅を広げる必要があります。

//list[csrunit.wmask.expand][CSRの書き込みマスクの幅を広げる (csrunit.veryl)]{
#@maprange(scripts/05/xlen-csrunit-range/core/src/csrunit.veryl,wmask)
    const MTVEC_WMASK : UIntX = 'h@<b>|ffff_ffff_|ffff_fffc;
    const MEPC_WMASK  : UIntX = 'h@<b>|ffff_ffff_|ffff_fffc;
    const MCAUSE_WMASK: UIntX = 'h@<b>|ffff_ffff_|ffff_ffff;
#@end
//}

=== LW命令の対応

RV64Iでは、LW命令の結果が64ビットに符号拡張されるようになります。
これに対応するため、memunitモジュールの@<code>{rdata}の割り当てのLW部分を変更します。

//list[csrunit.wmask.expand][LW命令のメモリの読み込み結果を符号拡張する (memunit.veryl)]{
#@maprange(scripts/05/xlen-memunit-range/core/src/memunit.veryl,lw)
    2'b10  : @<b>|{D[31] repeat W - 32, D[31:0]}|,
#@end
//}

== ADD[I]W, SUBW命令の実装

32ビット単位で足し算、引き算をする命令が追加されています。
これに対応するためにALUを変更します。

結果は符号拡張する必要があります。

== SLL[I]W, SRL[I]W, SRA[I]W命令の実装

32ビット単位に対してシフトする命令が追加されています。
これに対応するためにALUを変更します。

== LWU命令の実装

== LD, SD命令の実装

RV64Iには、64ビット単位でロード, ストアを行うLD命令, SD命令が定義されています。

=== メモリの幅を広げる


現在のメモリの1つのデータ@<code>{eei::MEM_DATA_WIDTH}の幅は32ビットですが、
このままだと64ビットでロードストアを行うときに、
最低2回のメモリアクセスが必要になってしまいます。

これを1回のメモリアクセスで済ませるために、
メモリ幅を32ビットから64ビットに広げておきます。



命令フェッチ部では、64ビットの読み出しデータの上位32ビット, 下位32ビットをPCの下位3ビットで選択します。
PC[2:0]が0のときは下位32ビット、4のときは上位32ビットになります。

プログラム

メモリ命令を処理する部分では、LW命令に新たにrdataの選択処理を追加します。
LB[U], LH[U]については上位32ビットの場合について追加します。
ストア命令では、マスクを変更し、アドレスに合わせてwdataを変更します。

プログラム


LWU命令は、LHU, LBU命令と同様に0拡張すればよいです。
LD命令は、メモリのrdataをそのまま結果に格納します。
SD命令は、マスクをすべて1で埋めて、wdataをレジスタの値をそのままにします。
