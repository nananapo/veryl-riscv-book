= M-modeの実装 (1. CSRの実装)

== 概要

「第II部 RV64IMACの実装」では、RV64IMACと例外、メモリマップドI/Oを実装しました。
「第III部 特権/割り込みの実装」では、次の機能を実装します。

 * 特権レベル (M-mode、S-mode、U-mode)
 * 仮想記憶システム(ページング)
 * 割り込み(CLINT、PLIC)

これらの機能を実装したCPUはOSを動かせる十分な機能を持っています。
第III部の最後ではLinuxを動かします。

=== 特権レベルとは何か？

CPUで動くアプリケーションは様々ですが、
多くのアプリケーションはOS(Operating System、オペレーティングシステム)の上で動かすことを前提に作成されています。
「OSの上で動かす」とは、アプリケーションはOSの機能を使い、OSに管理されながら実行されるということです。

多くのOSはデバイスやメモリなどのリソースの管理を行い、簡単にそれを扱うためのインターフェースをアプリケーションに提供します。
また、アプリケーションのデータを別のアプリケーションから保護したり、
OSが提供する方法でしかデバイスにアクセスできなくするなどのセキュリティ機能も備えています。

セキュリティ機能を実現するためには、OSがアプリケーションを実行するときにCPUが提供する一部の機能を制限する機能が必要です。
RISC-Vでは、この機能を特権レベル(privilege level)という機能、枠組みによって提供しています。
ほとんどの特権レベルの機能はCSRを通じて提供されます。

特権レベルはM-mode、S-mode、U-modeの3種類@<fn>{virtualization}が用意されています。
それぞれの特権レベルは2ビットの数値で表すことができます(@<list>{eei.veryl.define.PrivMode})。
数値が大きい方が高い特権レベルです。

//footnote[virtualization][V拡張が実装されている場合、さらに仮想化のための特権レベルが定義されます。]

高い特権レベルには低い特権レベルの機能を制限する機能があったり、高い特権レベルでしか利用できない機能が定義されています。

特権レベルを表す@<code>{PrivMode}型をeeiパッケージに定義してください
(@<list>{eei.veryl.define.PrivMode})。

//list[eei.veryl.define.PrivMode][PrivMode型の定義 (eei.veryl)][lineno=on]{
#@maprange(scripts/20/define-range/core/src/eei.veryl,PrivMode)
    enum PrivMode: logic<2> {
        M = 2'b11,
        S = 2'b01,
        U = 2'b00,
    }
#@end
//}

=== 特権レベルの実装順序

RISC-VのCPUに特権レベルを実装するとき、@<table>{privmode.kousei}のいずれかの構成にする必要があります。
特権レベルを実装していないときはM-modeだけが実装されているように扱います。

//table[privmode.kousei][RISC-VのCPUがとれる構成]{
存在する特権レベル	実装する章
-------------------------------------------------------------
M-mode	@<chapref>{20-mmode-csr}
M-mode、U-mode	@<chapref>{22-umode-csr}
M-mode、S-mode、U-mode	@<chapref>{23-smode-csr}
//}

CPUがリセット(起動)したときの特権レベルはM-modeです。
現在の特権レベルを保持するレジスタをcsrunitモジュールに作成します
(
@<list>{csrunit.veryl.define.mode}、
@<list>{csrunit.veryl.define.resetmode}
)。

//list[csrunit.veryl.define.mode][現在の特権レベルを示すレジスタの定義 (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/define-range/core/src/csrunit.veryl,mode)
    var mode: PrivMode;
#@end
//}

//list[csrunit.veryl.define.resetmode][レジスタをM-modeでリセットする (csrunit.veryl)][lineno=on]{
    always_ff {
        if_reset {
             @<b>|mode    = PrivMode::M;|
//}

本書で実装するM-modeのCSRのアドレスをすべて定義します
(@<list>{eei.veryl.define.CsrAddr})。
本章ではこの中の一部のCSRを実装し、
新しく実装する機能で使うタイミングで他のCSRを解説、実装します

#@# mapに戻す	できれば mepcを外した
//list[eei.veryl.define.CsrAddr][CSRのアドレスを定義する (eei.veryl)][lineno=on]{
#@# maprange(scripts/20/define-range/core/src/eei.veryl,CsrAddr)
    enum CsrAddr: logic<12> {
        @<b>|// Machine Information Registers|
        @<b>|MIMPID = 12'hf13,|
        @<b>|MHARTID = 12'hf14,|
        @<b>|// Machine Trap Setup|
        @<b>|MSTATUS = 12'h300,|
        @<b>|MISA = 12'h301,|
        @<b>|MEDELEG = 12'h302,|
        @<b>|MIDELEG = 12'h303,|
        @<b>|MIE = 12'h304,|
        MTVEC = 12'h305,
        @<b>|MCOUNTEREN = 12'h306,|
        @<b>|// Machine Trap Handling|
        @<b>|MSCRATCH = 12'h340,|
        MEPC = 12'h341,
        MCAUSE = 12'h342,
        MTVAL = 12'h343,
        MIP = 12'h344,
        @<b>|// Machine Counter/Timers|
        @<b>|MCYCLE = 12'hB00,|
        @<b>|MINSTRET = 12'hB02,|
        // Custom
        LED = 12'h800,
    }
#@# end
//}

=== XLENの定義

M-modeのCSRの多くは、特権レベルがM-modeのときのXLENであるMXLENをビット幅として定義されています。
S-mode、U-modeのときのXLENはそれぞれSXLEN、UXLENと定義されており、@<code>{MXLEN >= SXLEN >= UXLEN}を満たします。
仕様上はmstatusレジスタを使用してSXLEN、UXLENを変更できるように実装できますが、
本書ではMXLEN、SXLEN、UXLENが常に@<code>{64}(eeiパッケージに定義しているXLEN)になるように実装します。

== misaレジスタ (Machine ISA)

//image[misa][misaレジスタ][width=90%]

misaレジスタは、ハードウェアスレッドがサポートするISAを表すMXLENビットのレジスタです。
MXLフィールドにはMXLENを表す数値(@<table>{numtolen})が格納されています。
Extensionsフィールドは下位ビットからそれぞれアルファベットのA、B、 Cと対応していて、
それぞれのビットはそのアルファベットが表す拡張(例えばA拡張ならAビット、C拡張ならC)が実装されているなら@<code>{1}に設定されています。
仕様上はExtensionsフィールドを書き換えられるように実装できますが、本書では書き換えられないようにします。

//table[numtolen][XLENと数値の対応]{
XLEN	数値
-------------------------------------------------------------
32	1
64	2
128	3
//}

misaレジスタを作成し、読み込めるようにします
(
@<list>{csrunit.veryl.misa.misa}、
@<list>{csrunit.veryl.misa.rdata}
)。
CPUは@<code>{RV64IMAC}なのでMXLフィールドに@<code>{64}を表す@<code>{2}を設定し、
ExtensionsフィールドのM拡張(M)、基本整数命令セット(I)、C拡張(C)、A拡張(A)のビットを@<code>{1}にしています。

//list[csrunit.veryl.misa.misa][misaレジスタの定義 (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/misa-range/core/src/csrunit.veryl,misa)
    let misa  : UIntX = {2'd2, 1'b0 repeat XLEN - 28, 26'b00000000000001000100000101}; // M, I, C, A
#@end
//}

//list[csrunit.veryl.misa.rdata][misaレジスタを読めるようにする (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/misa-range/core/src/csrunit.veryl,rdata)
        rdata = case csr_addr {
            @<b>|CsrAddr::MISA  : misa,|
#@end
//}

これ以降、AというCSRのBフィールド、ビットのことをA.Bと表記することがあります。

== mimpidレジスタ (Machine Implementation ID)

//image[mimpid][mimpidレジスタ][width=90%]

mimpidレジスタは、プロセッサ実装のバージョンを表す値を格納しているMXLENビットのレジスタです。
値が@<code>{0}のときは、mimpidレジスタが実装されていないことを示します。

他にもプロセッサの実装の情報を表すレジスタ(mvendorid@<fn>{mvendorid}、marchid@<fn>{marchid})がありますが、本書では実装しません。

//footnote[mvendorid][製造業者のID(JEDEC ID)を格納します]
//footnote[marchid][マイクロアーキテクチャの種類を示すIDを格納します]

せっかくなので、適当な値を設定しましょう。
eeiパッケージにIDを定義して、読み込めるようにします
(
@<list>{eei.veryl.mimpid.mimpid}、
@<list>{csrunit.veryl.mimpid.rdata}
)。

//list[eei.veryl.mimpid.mimpid][IDを適当な値で定義する (eei.veryl)][lineno=on]{
#@maprange(scripts/20/mimpid-range/core/src/eei.veryl,mimpid)
    // Machine Implementation ID
    const MACHINE_IMPLEMENTATION_ID: UIntX = 1;
#@end
//}

//list[csrunit.veryl.mimpid.rdata][mipmidレジスタを読めるようにする (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mimpid-range/core/src/csrunit.veryl,rdata)
        rdata = case csr_addr {
            CsrAddr::MISA  : misa,
            @<b>|CsrAddr::MIMPID: MACHINE_IMPLEMENTATION_ID,|
#@end
//}

== mhartidレジスタ (Hart ID)

//image[mhartid][mhartidレジスタ][width=90%]

mhartidレジスタは、今実行しているハードウェアスレッド(hart)のIDを格納しているMXLENビットのレジスタです。
複数のプロセッサ、ハードウェアスレッドが存在するときに、それぞれを区別するために使用します。
IDはどんな値でも良いですが、環境内にIDが@<code>{0}のハードウェアスレッドが1つ存在する必要があります。
基本編で作るCPUは1コア1ハードウェアスレッドであるためmhartidレジスタに@<code>{0}を設定します。

mhartレジスタを作成し、読み込めるようにします
(
@<list>{csrunit.veryl.mhartid.mhartid}、
@<list>{csrunit.veryl.mhartid.rdata}
)。


//list[csrunit.veryl.mhartid.mhartid][mhartidレジスタの定義 (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mhartid-range/core/src/csrunit.veryl,mhartid)
    let mhartid: UIntX = 0;
#@end
//}

//list[csrunit.veryl.mhartid.rdata][mhartidレジスタを読めるようにする (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mhartid-range/core/src/csrunit.veryl,rdata)
        rdata = case csr_addr {
            CsrAddr::MISA   : misa,
            CsrAddr::MIMPID : MACHINE_IMPLEMENTATION_ID,
            @<b>|CsrAddr::MHARTID: mhartid,|
#@end
//}

== mstatusレジスタ (Machine Status)

//image[mstatus][mstatusレジスタ][width=90%]

mstatusレジスタは、拡張の設定やトラップ、状態などを管理するMXLENビットのレジスタです。
基本編では@<img>{mstatus}に示しているフィールドを、そのフィールドが必要になったときに実装します。
とりあえず今のところは読み込みだけできるようにします
(
@<list>{csrunit.veryl.mstatus.wmaskdef}、
@<list>{csrunit.veryl.mstatus.wmask}、
@<list>{csrunit.veryl.mstatus.reg}、
@<list>{csrunit.veryl.mstatus.rdata}、
@<list>{csrunit.veryl.mstatus.reset}、
@<list>{csrunit.veryl.mstatus.write}
)。

//list[csrunit.veryl.mstatus.wmaskdef][書き込みマスクの定義 (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mstatus-range/core/src/csrunit.veryl,wmaskdef)
    const MSTATUS_WMASK: UIntX = 'h0000_0000_0000_0000 as UIntX;
#@end
//}

//list[csrunit.veryl.mstatus.wmask][書き込みマスクを設定する (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mstatus-range/core/src/csrunit.veryl,wmask)
        wmask = case csr_addr {
            @<b>|CsrAddr::MSTATUS: MSTATUS_WMASK,|
#@end
//}

//list[csrunit.veryl.mstatus.reg][mstatusレジスタの定義 (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mstatus-range/core/src/csrunit.veryl,reg)
    var mstatus: UIntX;
#@end
//}

//list[csrunit.veryl.mstatus.rdata][mstatusレジスタを読めるようにする (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mstatus-range/core/src/csrunit.veryl,rdata)
        rdata = case csr_addr {
            CsrAddr::MISA   : misa,
            CsrAddr::MIMPID : MACHINE_IMPLEMENTATION_ID,
            CsrAddr::MHARTID: mhartid,
            @<b>|CsrAddr::MSTATUS: mstatus,|
#@end
//}

//list[csrunit.veryl.mstatus.reset][mstatusレジスタのリセット (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mstatus-range/core/src/csrunit.veryl,reset)
    always_ff {
        if_reset {
            mode    = PrivMode::M;
            @<b>|mstatus = 0;|
#@end
//}

//list[csrunit.veryl.mstatus.write][mstatusレジスタの書き込み (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mstatus-range/core/src/csrunit.veryl,write)
    if is_wsc {
        case csr_addr {
            @<b>|CsrAddr::MSTATUS: mstatus = wdata;|
            CsrAddr::MTVEC  : mtvec   = wdata;
#@end
//}

== ハードウェアパフォーマンスモニタ

RISC-Vには、ハードウェアの性能評価指標を得るためにmcycleとminstret、それぞれ29個のmhpmcounter、mhpmeventレジスタが定義されています。
それぞれ次の値を得るために利用できます。

 : mcycleレジスタ (64ビット)
    ハードウェアスレッドが起動(リセット)されてから経過したサイクル数
 : minstretレジスタ (64ビット)
    ハードウェアスレッドがリタイア(実行完了)した命令数
 : mhpmcounter、mhpmeventレジスタ (64ビット)
    mhpmeventレジスタで選択された指標がmhpmcounterレジスタに反映されます。

基本編ではmcycle、minstretレジスタを実装します。
mhpmcounter、mhpmeventレジスタは表示するような指標がないため実装しません。
また、mcountinhibitレジスタを使うとカウントを停止するかを制御できますが、これも実装しません。

=== mcycleレジスタ

mcycleレジスタを定義して読み込めるようにします。
(
@<list>{csrunit.veryl.mcycle.reg}、
@<list>{csrunit.veryl.mcycle.rdata}
)。

//list[csrunit.veryl.mcycle.reg][mcycleレジスタの定義 (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mcycle-range/core/src/csrunit.veryl,reg)
    var mcycle : UInt64;
#@end
//}

//list[csrunit.veryl.mcycle.rdata][rdataの割り当てで、mcycleレジスタを読めるようにする (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mcycle-range/core/src/csrunit.veryl,rdata)
    CsrAddr::MCYCLE : mcycle,
#@end
//}

always_ffブロックで、クロックごとに値を更新します
(
@<list>{csrunit.veryl.mcycle.always_ff}
)。

//list[csrunit.veryl.mcycle.always_ff][mcycleレジスタのリセットとインクリメント (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mcycle-range/core/src/csrunit.veryl,always_ff)
    always_ff {
        if_reset {
            mode    = PrivMode::M;
            mstatus = 0;
            mtvec   = 0;
            @<b>|mcycle  = 0;|
            mepc    = 0;
            mcause  = 0;
            mtval   = 0;
            led     = 0;
        } else {
            @<b>|mcycle += 1;|
#@end
//}

=== minstretレジスタ

coreモジュールでinstretレジスタを作成し、
トラップが発生していない命令がWBステージに到達した場合にインクリメントします
(
@<list>{core.veryl.minstret.minstret}、
@<list>{core.veryl.minstret.inc}
)。

//list[core.veryl.minstret.minstret][minstretレジスタの定義 (core.veryl)][lineno=on]{
#@maprange(scripts/20/minstret-range/core/src/core.veryl,minstret)
    var minstret        : UInt64;
#@end
//}

//list[core.veryl.minstret.inc][minstretレジスタのインクリメント (core.veryl)][lineno=on]{
#@maprange(scripts/20/minstret-range/core/src/core.veryl,inc)
    always_ff {
        if_reset {
            minstret = 0;
        } else {
            if wbq_rvalid && wbq_rready && !wbq_rdata.raise_trap {
                minstret += 1;
            }
        }
    }
#@end
//}

@<code>{minstret}の値をcsrunitモジュールに渡し、読み込めるようにします
(
@<list>{csrunit.veryl.minstret.port2}、
@<list>{core.veryl.minstret.port2}、
@<list>{csrunit.veryl.minstret.rdata}
)。


//list[csrunit.veryl.minstret.port2][csrunitモジュールのポートにminstretを追加する (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/minstret-range/core/src/csrunit.veryl,port2)
    minstret   : input  UInt64           ,
#@end
//}

//list[core.veryl.minstret.port2][csrunitモジュールのインスタンスにminstretレジスタを渡す (core.veryl)][lineno=on]{
#@maprange(scripts/20/minstret-range/core/src/core.veryl,port2)
        minstret                          ,
#@end
//}

//list[csrunit.veryl.minstret.rdata][minstretレジスタを読めるようにする (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/minstret-range/core/src/csrunit.veryl,rdata)
    CsrAddr::MCYCLE  : mcycle,
    @<b>|CsrAddr::MINSTRET: minstret,|
    CsrAddr::MEPC    : mepc,
#@end
//}

csrunitモジュールはMRET命令でも@<code>{raise_trap}フラグを立てるため、
このままではMRET命令で@<code>{minstret}がインクリメントされません。
そのため、トラップから戻る命令であることを示すフラグをcsrunitモジュールに作成し、
正しくインクリメントされるようにします
(
@<list>{csrunit.veryl.minstret.port1}、
@<list>{csrunit.veryl.minstret.trap_return}、
@<list>{core.veryl.minstret.port1}、
@<list>{core.veryl.minstret.raise_trap}
)。

//list[csrunit.veryl.minstret.port1][csrunitモジュールのポートにtrap_returnを追加する (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/minstret-range/core/src/csrunit.veryl,port1)
    trap_return: output logic            ,
#@end
//}

//list[csrunit.veryl.minstret.trap_return][MRET命令の時にtrap_returnを1にする (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/minstret-range/core/src/csrunit.veryl,trap_return)
    @<b>|// Trap Return|
    @<b>|assign trap_return = valid && is_mret && !raise_expt;|

    // Trap
    assign raise_trap  = raise_expt || @<b>|trap_return|;
#@end
//}

//list[core.veryl.minstret.port1][csrunitモジュールのインスタンスからtrap_returnを受け取る (core.veryl)][lineno=on]{
#@maprange(scripts/20/minstret-range/core/src/core.veryl,port1)
        trap_return: csru_trap_return     ,
#@end
//}

//list[core.veryl.minstret.raise_trap][MRET命令ならraise_trapフラグを立てないようにする (core.veryl)][lineno=on]{
#@maprange(scripts/20/minstret-range/core/src/core.veryl,raise_trap)
        wbq_wdata.raise_trap = csru_raise_trap @<b>|&& !csru_trap_return;|
#@end
//}

== mscratchレジスタ (Machine Scratch)

//image[mscratch][mscratchレジスタ][width=90%]

mscratchレジスタは、M-modeのときに自由に読み書きできるMXLENビットのレジスタです。

mscratchレジスタの典型的な用途はコンテキストスイッチです。
コンテキストスイッチとは、実行しているアプリケーションAを別のアプリケーションBに切り替えることを指します。
多くの場合、コンテキストスイッチはトラップによって開始しますが、
Aの実行途中の状態(レジスタの値)を保存しないとAを実行再開できなくなります。
そのため、コンテキストスイッチが始まったとき、つまりトラップが発生したときにレジスタの値をメモリに保存する必要があります。
しかし、ストア命令はアドレスの指定にレジスタの値を使うため、
アドレスの指定のために少なくとも1つのレジスタの値を犠牲にしなければならず、
すべてのレジスタの値を完全に保存できません@<fn>{save-near-zero}。

//footnote[save-near-zero][x0と即値を使うとアドレス0付近にすべてのレジスタの値を保存できますが、一般的な方法ではありません]

この問題を回避するために、一時的な値の保存場所としてmscratchレジスタが使用されます。
事前にmscratchレジスタにメモリアドレス(やメモリアドレスを得るための情報)を格納しておき、
CSRRW命令でmscratchレジスタの値とレジスタの値を交換することで任意の場所にレジスタの値を保存できます。

mscratchレジスタを定義し、自由に読み書きできるようにします
(
@<list>{csrunit.veryl.mscratch.reg}、
@<list>{csrunit.veryl.mscratch.reset}、
@<list>{csrunit.veryl.mscratch.rdata}、
@<list>{csrunit.veryl.mscratch.WMASK}、
@<list>{csrunit.veryl.mscratch.wmask}、
@<list>{csrunit.veryl.mscratch.write}
)。

//list[csrunit.veryl.mscratch.reg][mscratchレジスタの定義 (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mscratch-range/core/src/csrunit.veryl,reg)
    var mcycle  : UInt64;
    @<b>|var mscratch: UIntX ;|
    var mepc    : UIntX ;
#@end
//}

//list[csrunit.veryl.mscratch.reset][mscratchレジスタを0でリセットする (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mscratch-range/core/src/csrunit.veryl,reset)
    mtvec    = 0;
    @<b>|mscratch = 0;|
    mcycle   = 0;
#@end
//}

//list[csrunit.veryl.mscratch.rdata][mscratchレジスタを読めるようにする (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mscratch-range/core/src/csrunit.veryl,rdata)
    CsrAddr::MINSTRET: minstret,
    @<b>|CsrAddr::MSCRATCH: mscratch,|
    CsrAddr::MEPC    : mepc,
#@end
//}

//list[csrunit.veryl.mscratch.WMASK][書き込みマスクの定義 (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mscratch-range/core/src/csrunit.veryl,WMASK)
    const MTVEC_WMASK   : UIntX = 'hffff_ffff_ffff_fffc;
    @<b>|const MSCRATCH_WMASK: UIntX = 'hffff_ffff_ffff_ffff;|
    const MEPC_WMASK    : UIntX = 'hffff_ffff_ffff_fffe;
#@end
//}

//list[csrunit.veryl.mscratch.wmask][書き込みマスクをwmaskに割り当てる (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mscratch-range/core/src/csrunit.veryl,wmask)
    CsrAddr::MTVEC   : MTVEC_WMASK,
    @<b>|CsrAddr::MSCRATCH: MSCRATCH_WMASK,|
    CsrAddr::MEPC    : MEPC_WMASK,
#@end
//}

//list[csrunit.veryl.mscratch.write][mscratchレジスタの書き込み (csrunit.veryl)][lineno=on]{
#@maprange(scripts/20/mscratch-range/core/src/csrunit.veryl,write)
    CsrAddr::MTVEC   : mtvec    = wdata;
    @<b>|CsrAddr::MSCRATCH: mscratch = wdata;|
    CsrAddr::MEPC    : mepc     = wdata;
#@end
//}