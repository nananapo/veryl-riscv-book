= CPUのパイプライン処理化

これまでの章では、
同時に1つの命令のみを実行するCPUを実装しました。
高機能なCPUを実装するのは面白いですが、
プログラムの実行が遅くてはいけません。
機能を増やす前に、一度性能のことを考えてみましょう。

== CPUの性能を考える

CPUの性能指標は、
例えば消費電力や実行速度が考えられます。
本章では、プログラムの実行速度について考えます。

=== CPUの性能指標

プログラムの実行速度を比較する時、
プログラムの実行にかかる時間のみが絶対的な指標になります。
プログラムの実行時間は、簡単に、次のような式@<bib>{patahene}で表すことができます。

//texequation[][]{
CPU時間 = \frac{実行命令数 \times CPI}{クロック周波数}
//}

それぞれの用語の定義は次の通りです。

 : CPU時間 (CPU time)
    プログラムの実行のためにCPUが費やした時間

 : 実行命令数
    プログラムの実行で実行される命令数

 : CPI (clock cycles per instruction)
    プログラム全体またはプログラムの一部分の命令を実行した時の,
    1命令当たりの平均クロック・サイクル数

 : クロック周波数 (clock rate)
    クロック・サイクル時間(clock cycle time)の逆数

今のところ、CPUには命令をスキップしたり無駄に実行することはありません。
そのため、実行命令数はプログラムを1命令ずつ順に実行していった時の実行命令数になります。

CPIを計測するためには、
何の命令にどれだけのクロック・サイクル数がかかるかと、
それぞれの命令の割合が必要です。
メモリにアクセスする命令は3~4クロック、
それ以外の命令は1クロックで実行されます。
命令の割合については考えないでおきます。

クロック周波数は、CPUの回路のクリティカルパスの長さによって決まります。
クリティカルパスとは、組み合わせ回路の中で最も大きな遅延を持つパスのことです。

=== 実行速度を上げる方法を考える

CPU性能方程式の各項に注目すると、
CPU時間を減らすためには、
実行命令数を減らすか、
CPIを減らすか、
クロック周波数を増大させる必要があります。

==== 実行命令数に注目する

実行命令数を減らすためには、
コンパイラによる最適化でプログラムの命令数を減らすソフトウェア的な方法と、
命令セットアーキテクチャ(ISA)を変更することで必要な命令数を減らす方法が存在します。
どちらも本書の目的とするところではないので、検討しません@<fn>{other.runinst}。

//footnote[other.runinst][他の方法として、関数呼び出しやループをCPU側で検知して結果を保存, 利用することで実行命令数を減らす手法があります。この手法についてはずっと後の章で検討します。]

==== CPIに注目する

CPIを減らすためには、
1クロックで1つ以上の命令を実行開始し、1つ以上の命令を実行完了すればいいです。
これを実現する手法として、
スーパースカラやアウトオブオーダー実行が存在します。
これらの手法は後の章で解説, 実装します。

==== クロック周波数に注目する

クロック周波数を増大させるには、
クリティカルパスの長さを短くする必要があります。

今のところ、CPUは計算命令を1クロック(@<b>{シングルサイクル})で実行します。
例えばADD命令を実行する時、
FIFOに保存されたADD命令をデコードし、
命令のビット列をもとにレジスタのデータを選択し、
ALUで足し算を実行し、
その結果をレジスタにライトバックします。
これらを1クロックで実行するということは、
命令が保存されている32ビットのレジスタとレジスタファイルを入力に、
64ビットのADD演算の結果を出力する組み合わせ回路が存在するということです。
この回路は大変に段数の深い組み合わせ回路を必要とし、
長いクリティカルパスを生成する原因になります。

クロック周波数を増大させるもっとも単純な方法は、
命令の処理をいくつかの@<b>{ステージ(段)}に分割し、
複数クロックで1つの命令を実行することです。
複数のサイクルで命令を実行することから、
この形式のCPUは@<b>{マルチサイクル}CPUといいます。

//image[multicycle][命令の実行 (マルチサイクル)]

命令の処理をいくつかのステージに分割すると、
それに合わせて回路の深さが軽減され、
クロック周波数を増大させることができます。

@<img>{multicycle}では、
1つの命令を3クロック(ステージ)で実行しています。
3クロックもかかるのであれば、
CPIが3倍になり、
CPU時間が増えてしまいそうです。
しかし、処理を均等な3ステージに分割できた場合、
クロック周波数は3分の1になる@<fn>{multicycle.clock}ため、
それほどCPU時間は増えません。

//footnote[multicycle.clock][実際のところは均等に分割することはできないため、Nステージに分割してもクロック周波数はN分の1になりません]

しかし、CPIがステージ分だけ増大してしまうのは問題です。
これは、命令の処理を車の組立のように流れ作業で行うことで緩和することができます。
このような処理のことを、@<b>{パイプライン処理}と言います。

//image[pipeline][命令の実行 (パイプライン処理)]

本章では、
CPUをパイプライン処理化することで、
性能の向上を図ります。

=== パイプライン処理のステージについて考える

では、具体的に処理をどのようなステージに分割し、パイプライン処理を実現すればいいでしょうか?
これを考えるために、@<chap>{04-impl-rv32i}の最初で検討したCPUの動作を振り返ります。
@<chap>{04-impl-rv32i}では、CPUの動作を次のように順序付けしました。

 1. PCに格納されたアドレスにある命令をフェッチする
 2. 命令を取得したらデコードする
 3. 計算で使用するデータを取得する (レジスタの値を取得したり、即値を生成する)
 4. 計算する命令の場合、計算を行う
 5. メモリにアクセスする命令の場合、メモリ操作を行う
 6. 計算やメモリアクセスの結果をレジスタに格納する
 7. PCの値を次に実行する命令に設定する

もう少し大きな処理単位に分割しなおすと、
次の5つの処理(ステージ)を構成することができます。
ステージ名の後ろに、それぞれ対応する上のリストの処理の番号を記載しています。

 : IF (Instruction Fetch) ステージ (1)
    メモリから命令をフェッチします。@<br>{}
    フェッチした命令をIDステージに受け渡します

 : ID (Instruction Decode) ステージ (2,3)
    命令をデコードし、制御フラグと即値を生成します。@<br>{}
    生成したデータをEXステージに渡します。

 : EX (EXecute) ステージ (3, 4)
    制御フラグ, 即値, レジスタの値を利用し、ALUで計算します。@<br>{}
    分岐判定やジャンプ先の計算も行い、生成したデータをMEMステージに渡します。

 : MEM (MEMory) ステージ (5, 7)
    メモリにアクセスする命令とCSR命令を処理します。@<br>{}
    分岐命令かつ分岐が成立する, ジャンプ命令である, またはトラップが発生するとき、
    IF, ID, EXステージにある命令をフラッシュして、ジャンプ先をIFステージに伝えます。
    メモリ, CSRの読み込み結果等をWBステージに渡します。

 : WB (WriteBack) ステージ (6)
    ALUの演算結果, メモリやCSRの読み込み結果など、命令の処理結果をレジスタに書き込みます。

IF, ID, EX, MEM, WBの5段の構成を、
5段パイプラインと呼ぶことがあります。

//note[CSRをMEMステージで処理する]{
上記の5段のパイプライン処理では、CSRの処理をMEMステージで行っています。
これはいったいなぜでしょうか？

今のところCPUにはECALL命令による例外しか存在しないため、
EXステージでCSRの処理を行ってしまっても問題ありません。
しかし、他の例外、例えばメモリアクセスに伴う例外を実装するとき、
問題が生じます。

メモリアクセスに起因する例外が発生するのはMEMステージです。
このとき、EXステージでCSRの処理を行っていて、
EXステージに存在する命令がmtvecレジスタに書き込むCSRRW命令だった場合、
本来はMEMステージで発生した例外によって実行されないはずであるCSRRW命令によって、
既にmtvecレジスタが書き換えられているかもしれません。
これを復元する処理を書くことはできますが、
MEMステージ以降でCSRを処理することでもこの事態を回避できるため、
無駄な複雑性を導入しないために、MEMステージでCSRを処理しています。
//}

== パイプライン処理の実装

=== ステージに分割する準備をする

それでは、CPUをパイプライン処理化します。

パイプライン処理では、
複数のステージが、それぞれ違う命令を処理します。
そのため、それぞれのステージのために、
現在処理している命令を保持するためのレジスタ(@<b>{パイプラインレジスタ})を用意してあげる必要があります。

//image[pipeline_reg][パイプライン処理の概略図]

まず、処理を複数ステージに分割する前に、
既存のレジスタの名前を変更します。

現状のcoreモジュールでは、
命令をフェッチする処理に使う変数の名前の先頭に@<code>{if_}、
FIFOから取り出した命令の情報を表す変数の名前の先頭に@<code>{inst_}をつけています。

命令をフェッチする処理はIFステージに該当します。
名前はこのままで問題ありません。
しかし、@<code>{inst_}から始まる変数は、
CPUの処理を複数ステージに分けたとき、
どのステージのレジスタか分からなくなります。
IFステージの次はIDステージであるため、
とりあえず、
変数がIDステージのものであることを示す名前に変えてしまいましょう。

//list[ready.id_prefix][変数名を変更する (core.veryl)]{
#@maprange(scripts/05a/ifs-range/core/src/core.veryl,ifs)
    let ids_valid    : logic    = if_fifo_rvalid;
    var ids_is_new   : logic   ; // 命令が今のクロックで供給されたかどうか
    let ids_pc       : Addr     = if_fifo_rdata.addr;
    let ids_inst_bits: Inst     = if_fifo_rdata.bits;
    var ids_ctrl     : InstCtrl;
    var ids_imm      : UIntX   ;
#@end
//}

@<code>{inst_valid}, @<code>{inst_is_new}, @<code>{inst_pc}, 
@<code>{inst_bits}, @<code>{inst_ctrl}, @<code>{inst_imm}の名前を@<list>{ready.id_prefix}のように変更します。
定義だけではなく、変数を使用しているところもすべて変更してください。

=== FIFOを作成する

命令フェッチ処理とそれ以降の処理は、それぞれ独立して動作しています。
実は既にCPUは、IF, IDステージ(命令フェッチ以外の処理を行うステージ)の2ステージのパイプライン処理を行っています。

IFステージとIDステージはFIFOで区切られており、
FIFOのレジスタを経由して命令の受け渡しを行います。

これと同様に、
5ステージのパイプライン処理の実装では、
それぞれのステージをFIFOで接続します(@<img>{pipeline_fifo})。
ただし、FIFOのサイズは1とします。
この場合、FIFOはただの1つのレジスタです。

//image[pipeline_fifo][FIFOを利用したパイプライン処理]

IFからIDへのFIFOは存在するため、
IDからEX, EXからMEM, MEMからWBへのFIFOを作成します。

==== 構造体の定義

//image[fifo_type][メンバーの生存区間]

まず、FIFOに格納するデータの型を定義します。
それぞれのメンバーが存在する区間は@<img>{fifo_type}の通りです。

//list[fifo.type.ex][ID -> EXの間のFIFOのデータ型 (core.veryl)]{
#@maprange(scripts/05a/create-fifo-range/core/src/core.veryl,extype)
    struct exq_type {
        addr: Addr    ,
        bits: Inst    ,
        ctrl: InstCtrl,
        imm : UIntX   ,
    }
#@end
//}

IDステージは、IFステージから命令のアドレスと命令のビット列を受け取ります。
命令のビット列をデコードして、制御フラグと即値を生成し、EXステージに渡します。

//list[fifo.type.mem][EX -> NENの間のFIFOのデータ型 (core.veryl)]{
#@maprange(scripts/05a/create-fifo-range/core/src/core.veryl,memtype)
    struct memq_type {
        addr      : Addr       ,
        bits      : Inst       ,
        ctrl      : InstCtrl   ,
        imm       : UIntX      ,
        alu_result: UIntX      ,
        rs1_addr  : logic   <5>,
        rs1_data  : UIntX      ,
        rs2_data  : UIntX      ,
        br_taken  : logic      ,
        jump_addr : logic      ,
    }
#@end
//}

EXステージは、IDステージで生成された制御フラグと即値と受け取ります。
整数演算命令の時、レジスタのデータを読み取り、ALUで計算します。
分岐命令のとき、分岐判定を行います。
CSRやメモリアクセスでrs1, rs2のデータを利用するため、
演算の結果とともにMEMステージに渡します。

//list[fifo.type.wb][MEM -> WBの間のFIFOのデータ型 (core.veryl)]{
#@maprange(scripts/05a/create-fifo-range/core/src/core.veryl,wbtype)
    struct wbq_type {
        addr      : Addr    ,
        bits      : Inst    ,
        ctrl      : InstCtrl,
        imm       : UIntX   ,
        alu_result: UIntX   ,
        mem_rdata : UIntX   ,
        csr_rdata : UIntX   ,
    }
#@end
//}

MEMステージは、
メモリのロード結果とCSRの読み込みデータを生成し、
WBステージに渡します。

WBステージでは、
命令がライトバックする命令の時、
即値, ALUの計算結果, メモリのロード結果, CSRの読み込みデータから1つを選択し、
レジスタに値を書き込みます。

構造体のメンバーの生存区間が@<img>{fifo_type}のようになっている理由が、
なんとなく分かったでしょうか?

==== FIFOのインスタンス化

FIFOをインスタンス化します。
@<code>{DATA_TYPE}パラメータには、先ほど作成した構造体を設定します。
FIFOのデータの個数は1であるため、@<code>{WIDTH}パラメータには@<code>{1}を設定します@<fn>{fifo.width}。
@<code>{mem_wb_fifo}の@<code>{flush}が@<code>{0}になっていることに注意してください。

//footnote[fifo.width][FIFOのデータ個数は2 ** WIDTH - 1です]

//list[fifo.inst][FIFOのインスタンス化 (core.veryl)]{
#@maprange(scripts/05a/create-fifo-range/core/src/core.veryl,fifos)
    inst id_ex_fifo: fifo #(
        DATA_TYPE: exq_type,
        WIDTH    : 1       ,
    ) (
        clk                   ,
        rst                   ,
        flush : control_hazard,
        wready: exq_wready    ,
        wvalid: exq_wvalid    ,
        wdata : exq_wdata     ,
        rready: exq_rready    ,
        rvalid: exq_rvalid    ,
        rdata : exq_rdata     ,
    );

    inst ex_mem_fifo: fifo #(
        DATA_TYPE: memq_type,
        WIDTH    : 1        ,
    ) (
        clk                   ,
        rst                   ,
        flush : control_hazard,
        wready: memq_wready   ,
        wvalid: memq_wvalid   ,
        wdata : memq_wdata    ,
        rready: memq_rready   ,
        rvalid: memq_rvalid   ,
        rdata : memq_rdata    ,
    );

    inst mem_wb_fifo: fifo #(
        DATA_TYPE: wbq_type,
        WIDTH    : 1       ,
    ) (
        clk               ,
        rst               ,
        @<b>|flush : 0|         ,
        wready: wbq_wready,
        wvalid: wbq_wvalid,
        wdata : wbq_wdata ,
        rready: wbq_rready,
        rvalid: wbq_rvalid,
        rdata : wbq_rdata ,
    );
#@end
//}

=== IFステージを実装する

まず、IFステージを実装します。
...といっても、
既にIFステージ(=命令フェッチ処理)は独立に動くものとして実装されているため、
手を加える必要はありません。

ステージの区間を示すために、@<list>{mark_if}のようなコメントを挿入すると良いです。
ID, EX, MEM, WBステージを実装する時にも同様のコメントを挿入し、
ステージの処理のコードをまとまった場所に配置しましょう。

//list[mark_if][IFステージが始まることを示すコメントを挿入する (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,mark_if)
    ///////////////////////////////// IF Stage /////////////////////////////////

    var if_pc          : Addr ;
    ...
#@end
//}

=== IDステージを実装する

IDステージでは、命令をデコードします。

既に@<code>{ids_ctrl}, @<code>{ids_imm}には、
デコード結果の制御フラグと即値が割り当てられています。
そのため、既存のコードの変更は必要ありません。

デコード結果はEXステージに渡す必要があります。
EXステージにデータを渡すには、
@<code>{exq_wdata}にデータを割り当てます。

//list[always_comb_id][EXステージに値を渡す (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,always_comb_id)
    always_comb {
        // ID -> EX
        if_fifo_rready = exq_wready;
        exq_wvalid     = if_fifo_rvalid;
        exq_wdata.addr = if_fifo_rdata.addr;
        exq_wdata.bits = if_fifo_rdata.bits;
        exq_wdata.ctrl = ids_ctrl;
        exq_wdata.imm  = ids_imm;
    }
#@end
//}

IDステージにある命令は、
EXステージが命令を受け付けることができるとき(@<code>{exq_wready})、
IDステージを完了してEXステージに処理を進めることができます。
このロジックは、
@<code>{if_fifo_rready}に@<code>{exq_wready}を割り当てることで実現できます。

最後に、命令が今のクロックで供給されたかどうかを示す変数@<code>{id_is_new}は必要ないため削除します。

//list[id_is_new][id_is_newを削除する (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,id_is_new)
    @<del>|var ids_is_new   : logic   ;|
#@end
//}

=== EXステージを実装する

EXステージでは、
整数演算命令の時はALUで計算し、
分岐命令の時は分岐判定を行います。

まず、EXステージに存在する命令の情報を@<code>{exq_rdata}から取り出します。

//list[var_ex][変数の定義 (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,var_ex)
    let exs_valid    : logic    = exq_rvalid;
    let exs_pc       : Addr     = exq_rdata.addr;
    let exs_inst_bits: Inst     = exq_rdata.bits;
    let exs_ctrl     : InstCtrl = exq_rdata.ctrl;
    let exs_imm      : UIntX    = exq_rdata.imm;
#@end
//}

次に、EXステージで扱う変数の名前を変更します。
変数の名前に@<code>{exs_}をつけます。

//list[ex_prefix][変数名の変更対応 (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,ex_prefix)
    // レジスタ番号
    let @<b>|exs_|rs1_addr: logic<5> = @<b>|exs|_inst_bits[19:15];
    let @<b>|exs_|rs2_addr: logic<5> = @<b>|exs|_inst_bits[24:20];

    // ソースレジスタのデータ
    let @<b>|exs_|rs1_data: UIntX = if @<b>|exs_|rs1_addr == 0 {
        0
    } else {
        regfile[@<b>|exs_|rs1_addr]
    };
    let @<b>|exs_|rs2_data: UIntX = if @<b>|exs_|rs2_addr == 0 {
        0
    } else {
        regfile[@<b>|exs_|rs2_addr]
    };

    // ALU
    var @<b>|exs_|op1       : UIntX;
    var @<b>|exs_|op2       : UIntX;
    var @<b>|exs_|alu_result: UIntX;

    always_comb {
        case @<b>|exs|_ctrl.itype {
            InstType::R, InstType::B: {
                                          @<b>|exs_|op1 = @<b>|exs_|rs1_data;
                                          @<b>|exs_|op2 = @<b>|exs_|rs2_data;
                                      }
            InstType::I, InstType::S: {
                                          @<b>|exs_|op1 = @<b>|exs_|rs1_data;
                                          @<b>|exs_|op2 = @<b>|exs|_imm;
                                      }
            InstType::U, InstType::J: {
                                          @<b>|exs_|op1 = @<b>|exs|_pc;
                                          @<b>|exs_|op2 = @<b>|exs|_imm;
                                      }
            default: {
                         @<b>|exs_|op1 = 'x;
                         @<b>|exs_|op2 = 'x;
                     }
        }
    }

    inst alum: alu (
        ctrl  : @<b>|exs|_ctrl      ,
        op1   : @<b>|exs_|op1       ,
        op2   : @<b>|exs_|op2       ,
        result: @<b>|exs_|alu_result,
    );

    var @<b>|exs_|brunit_take: logic;

    inst bru: brunit (
        funct3: @<b>|exs|_ctrl.funct3,
        op1   : @<b>|exs_|op1        ,
        op2   : @<b>|exs_|op2        ,
        take  : @<b>|exs_|brunit_take,
    );
#@end
//}

最後に、MEMステージに命令とデータを渡します。
MEMステージにデータを渡すには、
@<code>{memq_wdata}にデータを割り当てます。

//list[always_comb_ex][MEMステージにデータを渡す (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,always_comb_ex)
    always_comb {
        // EX -> MEM
        exq_rready            = memq_wready;
        memq_wvalid           = exq_wvalid;
        memq_wdata.addr       = exq_rdata.addr;
        memq_wdata.bits       = exq_rdata.bits;
        memq_wdata.ctrl       = exq_rdata.ctrl;
        memq_wdata.imm        = exq_rdata.imm;
        memq_wdata.rs1_addr   = exs_rs1_addr;
        memq_wdata.rs1_data   = exs_rs1_data;
        memq_wdata.rs2_data   = exs_rs2_data;
        memq_wdata.alu_result = exs_alu_result;
        @<balloon>{ジャンプ命令、または、分岐命令かつ分岐が成立するとき、1にする}
        memq_wdata.br_taken   = exs_ctrl.is_jump || inst_is_br(exs_ctrl) && exs_brunit_take;
        memq_wdata.jump_addr  = if inst_is_br(exs_ctrl) {
            exs_pc + exs_imm @<balloon>{分岐命令の分岐先アドレス}
        } else {
            exs_alu_result @<balloon>{ジャンプ命令のジャンプ先アドレス}
        };
    }
#@end
//}

@<code>{br_taken}には、
ジャンプ命令かどうか、または分岐命令かつ分岐が成立するか、
という条件を割り当てます。
@<code>{jump_addr}には、
分岐命令、またはジャンプ命令のジャンプ先を割り当てます。
これを利用することで、MEMステージでジャンプと分岐を処理します。

EXステージにある命令は、
MEMステージが命令を受け付けることができるとき(@<code>{memq_wready})、
EXステージを完了してMEMステージに処理を進めることができます。
このロジックは、
@<code>{exq_rready}に@<code>{memq_wready}を割り当てることで実現できます。

=== MEMステージを実装する

MEMステージでは、メモリにアクセスする命令とCSR命令を処理します。
また、ジャンプ命令, 分岐命令かつ分岐が成立, またはトラップが発生する時、
次の命令のアドレスを変更します。

まず、MEMステージに存在する命令の情報を@<code>{memq_rdata}から取り出します。
MEMステージでは、csrunitモジュールに、
命令が今のクロックでMEMステージに供給されたかどうかの情報を渡す必要があります。
そのため、変数@<code>{mem_is_new}を定義しています。

//list[var_mem][変数の定義 (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,var_mem)
    var mems_is_new   : logic      ;
    let mems_valid    : logic       = memq_rvalid;
    let mems_pc       : Addr        = memq_rdata.addr;
    let mems_inst_bits: Inst        = memq_rdata.bits;
    let mems_ctrl     : InstCtrl    = memq_rdata.ctrl;
    let mems_rd_addr  : logic   <5> = mems_inst_bits[11:7];
#@end
//}

@<code>{mem_is_new}には、
もともと@<code>{id_is_new}の更新に利用していたロジックを利用します。

//list[mem_is_new][mem_is_newの更新 (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,mem_is_new)
    always_ff {
        if_reset {
            @<b>|mems|_is_new = 0;
        } else {
            if memq_rvalid {
                @<b>|mems|_is_new = memq_rready;
            } else {
                @<b>|mems|_is_new = 1;
            }
        }
    }
#@end
//}

次に、MEMモジュールで使う変数に合わせて、
ポートなどに割り当てている変数名を変更します。

//list[mem_prefix2][変数名の変更対応 (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,mem_prefix2)
    var memu_rdata: UIntX;
    var memu_stall: logic;

    inst memu: memunit (
        clk                          ,
        rst                          ,
        valid : @<b>|mems|_valid           ,
        is_new: @<b>|mems|_is_new          ,
        ctrl  : @<b>|mems|_ctrl            ,
        addr  : @<b>|memq_rdata.|alu_result,
        rs2   : @<b>|memq_rdata.|rs2_data  ,
        rdata : memu_rdata           ,
        stall : memu_stall           ,
        membus: d_membus             ,
    );

    var csru_rdata      : UIntX;
    var csru_raise_trap : logic;
    var csru_trap_vector: Addr ;

    inst csru: csrunit (
        clk                            ,
        rst                            ,
        valid   : @<b>|mems|_valid           ,
        pc      : @<b>|mems|_pc              ,
        ctrl    : @<b>|mems|_ctrl            ,
        rdaddr  : @<b>|mems|_rd_addr         ,
        csr_addr: @<b>|mems|_inst_bits[31:20],
        rs1     : if @<b>|mems|_ctrl.funct3[2] == 1 && @<b>|mems|_ctrl.funct3[1:0] != 0 {
            {1'b0 repeat XLEN - $bits(@<b>|memq_rdata.|rs1_addr), @<b>|memq_rdata.|rs1_addr} // rs1を0で拡張する
        } else {
            @<b>|memq_rdata.|rs1_data
        },
        rdata      : csru_rdata,
        raise_trap : csru_raise_trap,
        trap_vector: csru_trap_vector,
    );
#@end
//}

フェッチ先が変わったことを表す変数@<code>{control_hazard}と、
新しいフェッチ先を示す信号@<code>{control_hazard_pc_next}には、
EXステージで計算したデータとCSRステージのトラップ情報を利用するようにします。

//list[mem_prefix1][ジャンプ判定処理 (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,mem_prefix1)
    assign control_hazard         = @<b>|mems|_valid && (csru_raise_trap || @<b>|mems|_ctrl.is_jump || @<b>|memq_rdata.|br_taken);
    assign control_hazard_pc_next = if csru_raise_trap {
        csru_trap_vector
    } else {
        @<b>|memq_rdata.|jump_addr
    };
#@end
//}

@<code>{control_hazard}が@<code>{1}になったとき、
ID, EX, MEMステージに命令を供給するFIFOをフラッシュします。
@<code>{control_hazard}が@<code>{1}になるとき、
MEMステージの処理は完了しています。
後述しますが、WBステージの処理は必ず


MEMステージにある命令は、
memunitが処理中ではなく(@<code>{!memy_stall})、
WBステージが命令を受け付けることができるとき(@<code>{wbq_wready})、
MEMステージを完了してWBステージに処理を進めることができます。
このロジックについては、@<code>{memq_rready}と@<code>{wbq_wvalid}を確認してください。

//list[always_comb_mem][WBステージにデータを渡す (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,always_comb_mem)
    always_comb {
        // MEM -> WB
        memq_rready          = wbq_wready && !memu_stall;
        wbq_wvalid           = memq_rvalid && !memu_stall;
        wbq_wdata.addr       = memq_rdata.addr;
        wbq_wdata.bits       = memq_rdata.bits;
        wbq_wdata.ctrl       = memq_rdata.ctrl;
        wbq_wdata.imm        = memq_rdata.imm;
        wbq_wdata.alu_result = memq_rdata.alu_result;
        wbq_wdata.mem_rdata  = memu_rdata;
        wbq_wdata.csr_rdata  = csru_rdata;
    }
#@end
//}

=== WBステージを実装する

WBステージでは、命令の結果をレジスタに書き込みます。
WBステージが完了したら命令の処理は終わりなので、命令を破棄します。

まず、MEMステージに存在する命令の情報を@<code>{wbq_rdata}から取り出します。

//list[var_wb][変数の定義 (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,var_wb)
    let wbs_valid    : logic    = wbq_rvalid;
    let wbs_pc       : Addr     = wbq_rdata.addr;
    let wbs_inst_bits: Inst     = wbq_rdata.bits;
    let wbs_ctrl     : InstCtrl = wbq_rdata.ctrl;
    let wbs_imm      : UIntX    = wbq_rdata.imm;
#@end
//}

次に、WBステージで扱う変数の名前を変更します。
変数の名前には@<code>{wbs_}をつけます。

//list[wb_prefix][変数名の変更対応 (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,wb_prefix)
    let @<b>|wbs_|rd_addr: logic<5> = @<b>|wbs|_inst_bits[11:7];
    let @<b>|wbs_|wb_data: UIntX    = if @<b>|wbs|_ctrl.is_lui {
        @<b>|wbs|_imm
    } else if @<b>|wbs|_ctrl.is_jump {
        @<b>|wbs_pc| + 4
    } else if @<b>|wbs|_ctrl.is_load {
        @<b>|wbq_rdata.|mem_rdata
    } else if @<b>|wbs|_ctrl.is_csr {
        @<b>|wbq_rdata.|csr_rdata
    } else {
        @<b>|wbq_rdata.|alu_result
    };

    always_ff {
        if @<b>|wbs|_valid && @<b>|wbs|_ctrl.rwb_en {
            regfile[@<b>|wbs_|rd_addr] = @<b>|wbs_|wb_data;
        }
    }
#@end
//}

最後に、命令をFIFOから取り出します。
WBステージでは命令を複数クロックで処理することはなく、
WBステージの次のステージを待つ必要もないため、
@<code>{wbq_rready}に@<code>{1}を割り当てることで、
常にFIFOから命令を取り出します。

//list[always_comb_wb][命令をFIFOから取り出す (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,always_comb_wb)
    always_comb {
        // WB -> END
        wbq_rready = 1;
    }
#@end
//}

IF, ID, EX, MEM, WBステージを作成できたので、
5段パイプラインのCPUは完成です。

=== デバッグ用に情報を表示する

今までは同時に1つの命令しか処理していませんでしたが、
これからは全てのステージで別の命令を処理することになります。
デバッグ用の表示を変更しておきましょう。

@<list>{debug}のように、デバッグ表示のalways_ffブロックを変更します。

//list[debug][各ステージの情報を表示する (core.veryl)]{
#@maprange(scripts/05a/pipeline-range/core/src/core.veryl,debug)
    ///////////////////////////////// DEBUG /////////////////////////////////
    var clock_count: u64;

    always_ff {
        if_reset {
            clock_count = 1;
        } else {
            clock_count = clock_count + 1;

            $display("\n");
            $display("# %d", clock_count);

            $display("ID ------");
            if ids_valid {
                $display("  %h : %h", if_fifo_rdata.addr, if_fifo_rdata.bits);
                $display("  itype : %b", ids_ctrl.itype);
                $display("  imm   : %h", ids_imm);
            }
            $display("EX -----");
            if exq_rvalid {
                $display("  %h : %h", exq_rdata.addr, exq_rdata.bits);
                $display("  op1     : %h", exs_op1);
                $display("  op2     : %h", exs_op2);
                $display("  alu     : %h", exs_alu_result);
                if inst_is_br(exs_ctrl) {
                    $display("  br take : ", exs_brunit_take);
                }
            }
            $display("MEM -----");
            if memq_rvalid {
                $display("  %h : %h", memq_rdata.addr, memq_rdata.bits);
                $display("  mem stall : %b", memu_stall);
                $display("  mem rdata : %h", memu_rdata);
                if mems_ctrl.is_csr {
                    $display("  csr rdata : %h", csru_rdata);
                    $display("  csr trap  : %b", csru_raise_trap);
                    $display("  csr vec   : %h", csru_trap_vector);
                }
            }
            $display("WB ----");
            if memq_rvalid {
                $display("  %h : %h", wbq_rdata.addr, wbq_rdata.bits);
                if wbs_ctrl.rwb_en {
                    $display("  reg[%d] <= %h", wbs_rd_addr, wbs_wb_data);
                }
            }
        }
    }
#@end
//}

=== パイプライン処理のテスト

それでは、riscv-testsを実行してみましょう。
RV32I, RV64I向けのテストを実行します。

//terminal[pipeline.test][riscv-testsの実行]{
//}

おや?テストにパスしません。
一体何が起きているのでしょうか?

== データハザードの対処

実は、
ただIF, ID, EX, MEM, WBステージに処理を分割するだけでは、
正しく命令を実行することができません。

=== 正しく動かないプログラムを実行する

例えば、@<list>{dh.example}のようなプログラムは正しく動きません。
@<code>{test/dh.hex}として、プログラムを記述します。

//list[dh.example][正しく動かないプログラムの例 (test/dh.hex)]{
//}

=== データ依存

=== データ依存の対処

=== パイプライン処理をテストする

それでは、@<code>{test/dh.hex}を実行して、
正しく動くことを確認します。

//terminal[dh.test.successful][test/dh.hexが正しく動くことを確認する]{
//}

riscv-testsも実行しましょう。

//terminal[riscvtests.successful][riscv-testsを実行する]{
//}

テストにパスすることを確認できました。

