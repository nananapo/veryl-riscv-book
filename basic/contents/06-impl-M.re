= M拡張の実装

TODO
フォワーディングの話はあと！

前章ではRV64Iを実装しました。
RV64Iは64ビットの基本整数命令セットであり、基本的な演算しか実装されていません。
M拡張はこれにかけ算と割り算の命令を実装します。

M拡張には、かけ算をおこなうMUL命令、割り算をおこなうDIV命令、剰余を求めるREM命令があります。
これらの計算はVerylに用意されている*, /, %演算子で実装することができますが、
これによって自動で実装される回路は1クロックで計算を完了させる非常に大きなものになってしまい、CPUの最大周波数を大幅に低下させてしまいます。
これを回避するために、複数クロックでゆっくり計算を行うモジュールを作成します。

== MUL[W]命令

== MULH命令

== MULHU命令

== MULHSU命令

== DIV[W]命令

引き放し法でやる

== DIVU[W]命令

== REM[W]命令

== REMU[W]命令
