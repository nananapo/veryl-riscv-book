= M拡張の実装

TODO

これまでの章で基本的な整数演算の命令を実装したので、
本章では乗算、除算、剰余を求める命令を実装します。
RISC-Vの乗算、除算を行う命令はM拡張に定義されており、
M拡張を実装したRV64IのISAのことを@<code>{RV64IM}と表現します。

M拡張には、XLENが32のときは@<table>{m.instructions.32}の命令が定義されています。
XLENが64のときは@<table>{m.instructions.64}の命令が定義されています。

//table[m.instructions.32][M拡張の命令 (XLEN=32)]{
命令	動作
-------------------------------------------------------------
MUL		rs1(符号付き) × rs2(符号付き)の結果(64ビット)の下位32ビットを求める
MULHU	rs1(符号無し) × rs2(符号無し)の結果(64ビット)の上位32ビットを求める
MULHSU	rs1(符号付き) × rs2(符号無し)の結果(64ビット)の上位32ビットを求める
DIV		rs1(符号付き) / rs2(符号付き)を求める
DIVU	rs1(符号無し) / rs2(符号無し)を求める
REM		rs1(符号付き) % rs2(符号付き)を求める
REMU	rs1(符号無し) % rs2(符号無し)を求める
//}

//table[m.instructions.64][M拡張の命令 (XLEN=64)]{
命令	動作
-------------------------------------------------------------
MUL		rs1(符号付き) × rs2(符号付き)の結果(128ビット)の下位64ビットを求める
MULW	rs1[31:0](符号付き) × rs2[31:0](符号付き)の結果(64ビット)の下位32ビットを求める@<br>{}結果は符号拡張する
MULHU	rs1(符号無し) × rs2(符号無し)の結果(128ビット)の上位64ビットを求める
MULHSU	rs1(符号付き) × rs2(符号無し)の結果(128ビット)の上位64ビットを求める
DIV		rs1(符号付き) / rs2(符号付き)を求める
DIVW	rs1[31:0](符号付き) / rs2[31:0](符号付き)を求める@<br>{}結果は符号拡張する
DIVU	rs1(符号無し) / rs2(符号無し)を求める
DIVWU	rs1[31:0](符号無し) / rs2[31:0](符号無し)を求める@<br>{}結果は符号拡張する
REM		rs1(符号付き) % rs2(符号付き)を求める
REMW	rs1[31:0](符号付き) % rs2[31:0](符号付き)を求める@<br>{}結果は符号拡張する
REMU	rs1(符号無し) % rs2(符号無し)を求める
REMUW	rs1[31:0](符号無し) % rs2[31:0](符号無し)を求める@<br>{}結果は符号拡張する
//}

== MUL、MULH[[S]U]、MULW命令の実装

//list[][]{
import eei::*;
module muldivunit (
    clk   : input  clock    ,
    rst   : input  reset    ,
    valid : input  logic    ,
    ready : output logic    ,
    funct3: input  logic <3>,
    op1   : input  UInt64   ,
    op2   : input  UInt64   ,
    rvalid: output logic    ,
    result: output UInt64   ,
) {}
//}

=== MULHU命令の実装

 1. 筆算をそのまま実行するかけ算モジュールを作成する

=== MUL、MULW命令の実装

 1. 正 * 正に変更して計算、符号を戻す
 2. (-A[msb] * 2**63 + A[msb-1:lsb]) * (-B[msb] * 2**63 + B[msb-1:lsb])を展開して計算する


付録でやる？
 1. 1ビットの加算器で構成
 2. ウォレス木で構成する
 3. パイプライン化する (しないと性能が駄目)

=== MULHSU命令の実装

 1. 65ビットの演算にして、符号拡張の方法によって実装する

== DIV[U]、DIV[U]W、REM[U]、REM[U]W命令の実装

 1. 筆算をそのまま実行する割り算モジュールを作成する
 2. 引き放し法を使う