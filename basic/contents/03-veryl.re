= ハードウェア記述言語 Veryl

CPU (Central Proccessing Unit, 中央演算処理装置)は、
コンピュータを構成する主要な部品の1つであり、
電気で動くとても複雑な回路で構成されています。

本書では「ハードウェア記述言語」によってCPUをの回路を記述します。
回路を記述するといっても、いったい何をどうやって記述するのでしょうか?

まずは、論理回路を構成する方法から考えます。

=={hdl} ハードウェア記述言語

=== 論理回路の構成

@<b>{論理回路}とは、
デジタル(例えば0と1だけ)なデータを利用して、データを加工、保持する回路のことです。
論理回路は、組み合わせ回路と順序回路に分類できます。

@<b>{組み合わせ回路}とは、
入力に対して、一意に出力の決まる回路@<bib>{ronrikairo}のことです。
例えば、1ビット同士の加算をする回路は@<img>{halfadder}、@<table>{halfadder.truth}のように表されます。
この回路は半加算器と呼ばれていて、
1ビットのXとYを入力として受けとり、1ビットの和Sと桁上げCを出力します。
入力(X、Y)が決まると出力(C、S)が一意に決まるため、半加算器は組み合わせ回路です。

//image[halfadder][半加算器 (MIL記法の回路図)][width=45%]

//table[halfadder.truth][半加算器 (真理値表)]{
X	Y	C	S
-------------------------------------------------------------
0	0	0	0
0	1	0	1
1	0	0	1
1	1	1	0
//}

@<b>{順序回路}とは、
入力と回路自身の状態によって一意に出力の決まる回路@<bib>{ronrikairo}です。
例えば、入力が1になるたびにカウントアップして値を表示するカウンタを考えます(@<img>{downcounter})。
カウントアップするためには、
今のカウンタの値(状態)を保持する必要があります。
そのため、このカウンタは入力と状態によって一意に出力の決まる順序回路です。

1ビットの値はフリップフロップ(flip-flop, FF)という回路によって保持できます。
フリップフロップをN個並列に並べると、Nビットの値を保持できます。
フリップフロップを並列に並べた記憶装置のことを@<b>{レジスタ}(register, 置数器)と呼びます。
基本的に、レジスタの値は@<b>{リセット信号}(reset signal, reset)によって初期化し、
@<b>{クロック信号}(clock signal, clock)に同期したタイミングで変更します。

//image[downcounter][カウンタ (順序回路の例)][width=70%]

論理回路を設計するには、真理値表を作成し、
それを実現する論理演算を構成します。
入力数や状態数が数十個ならどうにか人力で設計できるかもしれませんが、
数千、数万の入力や状態があるとき、
手作業で設計するのはほとんど不可能です。
これを設計するために、ハードウェア記述言語を利用します。

=== ハードウェア記述言語

@<b>{ハードウェア記述言語}(Hardware Description Language, HDL)とは、
デジタル回路を設計するための言語です。
例えばHDLであるSystemVerilogを利用すると、
半加算器は@<list>{halfadder.sv}のように記述できます。

//list[halfadder.sv][SystemVerilogによる半加算器の記述]{
module HalfAdder(
  input logic x,	// 入力値X
  input logic y,	// 入力値Y
  output logic c,	// 出力値C
  output logic s	// 出力値S
);
  assign c = x & y; // &はAND演算
  assign s = x ^ y; // ^はXOR演算
endmodule
//}

半加算器(HalfAdder)モジュールは、
入力としてxとyを受け取り、
出力cとsにxとyを使った演算を割り当てています。

また、レジスタを利用した回路を@<list>{counter.sv}のように記述できます。
レジスタの値を、
リセット信号@<code>{rst}が@<code>{0}になったタイミングで@<code>{0}に初期化し、
クロック信号@<code>{clk}が@<code>{1}になったタイミングでカウントアップします。

//list[counter.sv][SystemVerilogによるカウンタの記述]{
module Counter(
  input logic clk, // クロック信号
  input logic rst  // リセット信号
);
  // 32ビットのレジスタの定義
  logic [31:0] count;

  always_ff @(posedge clk, negedge rst) begin
    if (!rst) begin
      // rstが0になったとき、countを0に初期化する
      count <= 0;
    end else begin
      // clkが1になったとき、countの値をカウントアップする
      count <= count + 1;
    end
  end
endmodule
//}

HDLを使用した論理回路の設計は、
レジスタの値と入力値を使った組み合わせ回路と、
その結果をレジスタに格納する操作の記述によって行えます。
このような、レジスタからレジスタに、
組み合わせ回路を通したデータを転送する抽象度のことを
@<b>{レジスタ転送レベル}(Register Transfer Level, @<b>{RTL})と呼びます。

HDLで記述されたRTLを実際の回路のデータに変換することを@<b>{合成}と呼びます。
合成するソフトウェアのことを合成系と呼びます。

=== Veryl

メジャーなHDLといえば、Verilog HDL、SystemVerilog, VHDLなどが挙げられます。

Verilog HDL(Verilog)とVHDLは1980年代に開発された言語であり、
最近のプログラミング言語と比べると機能が少なく、冗長な記述が必要です。
SystemVerilogはVerilogのスーパーセットです。
言語機能が増えて便利になっていますが、
スーパーセットであることから、
あまり推奨されない古い書き方が可能だったり、
バグの原因となるような良くない仕様@<fn>{nettype}を受け継いでいます。

//footnote[nettype][例えば、未定義の変数が1ビット幅の信号線として解釈される仕様があります]

本書では、CPUの実装にVerylというHDLを使用します。
Verylは2022年12月に公開された言語です。
Verylの抽象度は、Verilogと同じくレジスタ転送レベルです。
Verylの文法や機能は、VerilogやSystemVerilogに似通ったものになっています。
しかし、
if式やcase式、
クロックとリセットの抽象化、
ジェネリクスなどの痒い所に手が届く機能が提供されており、
高い生産性を発揮します。

Verylのソースコードはコンパイラ(トランスパイラ)によって、
自然で読みやすいSystemVerilogのソースコードに変換されます。
そのため、Verylは旧来のSystemVerilogの環境と共存でき、
SystemVerilogの資産を利用できます。

//caution[注意]{
本書は2024/11/3時点のVeryl(バージョン0.13.2)を、
本書で利用する範囲の文法と機能を解説しています。
Verylはまだ開発中(安定版がリリースされていない)状態の言語であるため、
破壊的変更が入り、記載しているコードが使えなくなる可能性があります。
//}

== Verylの基本文法、機能

それでは、Verylの書き方を学んでいきましょう。
Verylのドキュメントは@<href>{https://doc.veryl-lang.org/book/ja/}に存在します。
また、@<href>{https://doc.veryl-lang.org/playground/, Veryl Playground}では、
VerylのSystemVerilogへのトランスパイルをウェブブラウザ上でお試しできます。

=== コメント

Verylでは次のようにコメントを記述できます(@<list>{code.comment})。

//list[code.comment][コメント]{
  // 1行のコメント
  /* 範囲コメント */
  /*
     範囲コメントは改行してもOK
  */
//}

=== 値、リテラル

論理回路では、デジタルな値を扱います。
デジタルな値は@<code>{0}と@<code>{1}の二値(2-state)で表現されますが、
一般的なハードウェア記述言語では、
@<code>{0}と@<code>{1}に@<code>{x}と@<code>{z}を加えた四値(4-state)が利用されます(@<table>{table.fourstate})。

//table[table.fourstate][4-stateの値]{
値	意味				真偽
-------------------------------------------------------------
0	0					偽
1	1					真
x	不定値				偽
z	ハイインピーダンス	偽
//}

@<b>{不定値}(unknown value, @<code>{x})とは、@<code>{0}か@<code>{1}のどちらか分からない値です。
不定値は、未初期化のレジスタの値の表現に利用されたり、
不定値との演算の結果として生成されます。
@<b>{ハイインピーダンス}(high-inpedance, @<code>{z})とは、
どのレジスタや信号とも接続されていないことを表す値です。
物理的なハードウェア上では、
全ての値は@<code>{0}か@<code>{1}の二値として解釈されますが、
信号の状態としてハイインピーダンスを持ちます。
不定値はシミュレーションのときに利用します。

1ビットの四値を表現するための型は@<b>{logic}です。
Nビットのlogic型は@<code>{logic<N>}と記述できます。
1ビットの二値を表現する型は@<b>{bit}です。
基本的に、レジスタや信号の定義にbit型は利用せず、logic型を利用します。

logic型とbit型は、デフォルトで符号が無い型として扱われます。
符号付き型として扱いたいときは、
型名の前に@<b>{signed}キーワードを追加します
(@<list>{code.signed_keyword})。

//list[code.signed_keyword][符号付き型]{
signed logic<4> // 4ビットの符号付きlogic型
signed bit<2> // 2ビットの符号付きbit型
//}

32ビットと64ビットのbit型を表す型が定義されています(@<table>{ui3264})。

//table[ui3264][整数型]{
型名	等価な型
-------------------------------------------------------------
u32		@<code>{bit<32>}
u64		@<code>{bit<64>}
i32		@<code>{signed bit<32>}
i64		@<code>{signed bit<64>}
//}

数値は@<list>{code.num_literal}のように記述できます。

//clearpage

//list[code.num_literal][数値リテラル]{
4'b0101 // 4ビットの数値 (2進数表記)
4'bxxzz // 4ビットの数値 (2進数表記)

12'o34xz // 12ビットの数値 (8進数表記)
32'h89abcdef // 32ビットの数値 (16進数表記)

123 // 10進数の数値
32'd12345 // 32ビットの数値 (10進数表記)

// 数値リテラルの好きな場所に_を挿入できる
1_2_34_567

// xとzは大文字でも良い
4'bxXzZ

// 全ビット0、1、x、zにする
'0
'1
'x
'z

// 指定したビット幅だけ0、1、x、zにする
8'0 // 8ビット0
8'1 // 8ビット1
8'x // 8ビットx
8'z // 8ビットz

// 幅を指定しない場合、幅が自動で推定される
'hffff // 16ビット
'h1fff // 13ビット (13'b1_1111_1111_1111)
//}

文字列は@<b>{string}型で表現できます。
文字列の値は@<list>{string.literal}のように記述できます。

//list[string.literal][文字列リテラル]{
"Hello World!" // 文字列リテラル 
"abcdef\nabc"  // エスケープシーケンスを含む文字列リテラル
//}

=== module

論理回路は@<b>{モジュール}(Module)というコンポーネントで構成されます。
例えば、半加算器のモジュールは次のように定義できます(@<list>{halfadder.veryl}).

//list[halfadder.veryl][半加算器(HalfAdder)モジュール]{
module HalfAdder (
	x: input  logic, // 1ビットのlogic型の入力
	y: input  logic, // 1ビットのlogic型の入力
	s: output logic, // 1ビットのlogic型の出力
	c: output logic, // 1ビットのlogic型の出力
) {
	always_comb {
		s = x ^ y; // sにx XOR yを代入
		c = x & y; // cにx AND yを代入
	}
}
//}

HalfAdderモジュールには、
入力変数として@<code>{x}と@<code>{y}、
出力変数として@<code>{s}と@<code>{c}が宣言されています。
入出力の変数のことを@<b>{接続ポート}、または単に@<b>{ポート}と呼びます。

入力ポートを定義するとき、モジュール名の後の括弧の中に、
@<code>{変数名 : input 型名}と記述します。
出力ポートを宣言するときは@<code>{input}の代わりに@<code>{output}と記述します。
複数のポートを宣言するとき、宣言の末尾にカンマ(@<code>{,})を記述します。

==== 変数のブロッキング代入

HalfAdderモジュールでは、
@<b>{always_comb}ブロックの中で出力変数
@<code>{s}と@<code>{c}に値を代入しています。
変数への代入は@<code>{変数名 = 式;}で行います。
always_combブロック内での代入のことを、
@<b>{ブロッキング代入}(blocking assignment)と呼びます。

通常のプログラミング言語での代入とは、
スタック領域やレジスタに存在する変数に値を格納することです。
これに対してalways_combブロック内での代入は、
式が評価(計算)された値が変数に1度だけ代入されるのではなく、
変数の値は常に式の計算結果になります。

具体例で考えます。
例えばalways_combブロックの中で、1ビットの変数@<code>{x}に1ビットの変数@<code>{y}を代入します
(@<list>{assign.wave})。

//list[assign.wave][xにyを割り当てる]{
always_comb {
	x = y;
}
//}

@<code>{y}の値が時間経過により@<code>{0}→@<code>{1}→@<code>{0}→@<code>{1}→@<code>{0}と変化したとします。
このとき、@<code>{x}の値は@<code>{y}が変わるのと同時に変化します(@<img>{assign_wave})。
@<img>{assign_wave}は、時間を横軸、@<code>{x}と@<code>{y}の値を線の高低で表しています。
@<img>{assign_wave}のような図を@<b>{波形図}(waveform)、または単に@<b>{波形}と呼びます。

@<code>{x}に@<code>{y}ではなく@<code>{a + b}を代入すると、@<code>{a}か@<code>{b}の変化をトリガーに@<code>{x}の値が変化します。

//image[assign_wave][xはyの値の変化に追従する][width=60%]

//clearpage

always_combブロックには複数の代入文を記述できます。
このとき、代入文は上から順番に実行(逐次実行)されます。

//list[always_comb.order][ブロッキング代入は逐次実行される]{
always_comb {
	s = X;
	a = s; // a = X
	s = Y;
	b = a; // b = Y
}
//}

例えば@<list>{always_comb.order}では、
@<code>{a}には@<code>{X}が代入されますが、@<code>{b}には@<code>{Y}が代入されます。
変数@<code>{a}と@<code>{b}と@<code>{s}は、変数@<code>{X}か@<code>{Y}の変化をトリガーに値が更新されます。

1つの変数にしかブロッキング代入しないとき、
@<b>{assign}文でもブロッキング代入できます
(@<list>{always_comb.assign})。

//list[always_comb.assign][assign文によるブロッキング代入]{
// assign 変数名 = 式;
assign a = b + 100;
//}

always_combブロック内での代入と同じように、
@<list>{always_comb.assign}では@<code>{b}の変化をトリガーに@<code>{a}の値が変化します。

ブロッキング代入は論理回路の状態(レジスタ)を変更しません。
そのため、ブロッキング代入文は組み合わせ回路になります。

==== 変数の宣言

モジュールの中では、
@<b>{var}文によって新しく変数を宣言できます(@<list>{var.stmt})。

//list[var.stmt][変数の宣言]{
// var 変数名 : 型名;
var value : logic<32>;
//}

var文で宣言した変数に対してブロッキング代入できます。

@<b>{let}文を使うと、
変数の宣言とブロッキング代入を同時に行えます(@<list>{let.stmt})。

//list[let.stmt][変数の宣言とブロッキング代入]{
// let 変数名 : 型名 = 式;
let value : logic<32> = 100 + a;
//}

==== レジスタの定義と代入

変数を宣言するとき、
変数に式がブロッキング代入されない場合、
変数はレジスタとして解釈できます
(@<list>{reg.define})。

//list[reg.define][レジスタの定義]{
// var レジスタ名 : 型名;
var reg_value : logic<32>;

// reg_valueにブロッキング代入しない
//}

本書ではレジスタのことを変数、
または変数のことをレジスタと呼ぶことがあります。

レジスタの値はクロック信号に同期したタイミングで変更し、
リセット信号に同期したタイミングで初期化します(@<img>{register_wave})。
本書では、
クロック信号が@<b>{立ち上がる}(@<code>{0}から@<code>{1}に変わる)タイミングでレジスタの値を変更し、
リセット信号が@<b>{立ち下がる}(@<code>{1}から@<code>{0}に変わる)タイミングでレジスタの値を初期化することとします。

//image[register_wave][レジスタ(value)の値はクロック信号(clk)が立ち上がるタイミングで変わる][width=50%]

レジスタの値は、@<b>{always_ff}ブロックで初期化、変更します(@<list>{always_ff.first})。
always_ffブロックには、値の変更タイミングのためのクロック信号とリセット信号を指定します。

//list[always_ff.first][レジスタの値の初期化と変更]{
// レジスタの定義
var value : logic<32>;

// always_ff(クロック信号, リセット信号)
always_ff(clk, rst) {
	if_reset {
		// リセット信号のタイミングで0に初期化する
		value = 0;
	} else {
		// クロック信号のタイミングでカウントアップする
		value = value + 1;
	}
}
//}

@<b>{if_reset}文の中の文は、リセット信号のタイミングで実行されます。
if_reset文にelse文を付けることで、クロック信号のタイミングで処理を実行できます。
レジスタの値をリセットしない場合、リセット信号とif_reset文を省略することができます。
逆に、リセット信号を指定する場合は必ずif_reset文を書かなければいけません。

クロック信号はclock型、リセット信号はreset型で定義します。
モジュールのポートに１組のクロック信号とリセット信号が定義されているとき、
always_ffブロックのクロック信号とリセット信号の指定を省略できます
(@<list>{always_ff.omit})。

//clearpage

//list[always_ff.omit][クロック信号とリセット信号の省略]{
module ModuleA(
  clk: input clock,
  rst: input reset,
){
	// always_ff(clk, rst)と等しい
	always_ff {}
}
//}

レジスタの値は、
同じタイミングで動くalways_ffブロックの中の全ての代入文の右辺を評価した後に変更されます
(@<list>{multi.always_ff.nonblocking})。
この代入はブロッキング代入と違って逐次実行されないので、
@<b>{ノンブロッキング代入}(non-blocking assignment)と呼びます。

2つ以上のalways_ffブロックで、
1つの同じレジスタの値を変更することはできません。

//list[multi.always_ff.nonblocking][複数のレジスタの値を同じタイミングで変更する]{
// 全ての代入文の右辺を評価した後に、AとBが変更される
// その結果、AとBの値が入れ替わる
always_ff(clk, rst) {
	A = B;
}
always_ff(clk, rst) {
	B = A;
}
//}

@<list>{multi.always_ff.nonblocking}の@<code>{A}と@<code>{B}の代入文は、
1つのalways_ffブロックにまとめて記述できます(@<list>{always_ff.nonblocking})。
この場合も@<list>{multi.always_ff.nonblocking}と同様に、
@<code>{A}と@<code>{B}の代入文の右辺を評価した後に、
レジスタの値が変更されます。

//list[always_ff.nonblocking][ノンブロッキング代入の更新タイミングは同じ]{
always_ff {
	// AとBの値を入れ替える
	A = B;
	B = A;
}
//}

本書ではブロッキング代入とノンブロッキング代入を区別せず、
どちらも代入と呼ぶことがあります。

変数への代入方法と動作を@<table>{table.assign}にまとめます。
大変間違えやすいため、気を付けてください。

//table[table.assign][変数への代入方法と動作の違い]{
代入場所	代入文の名称			更新タイミング
==========================================================================================================
always_comb	ブロッキング代入		ブロック内の式で参照されている変数が更新されたとき。@<br>{}上から順に実行される。
always_ff	ノンブロッキング代入	クロック信号、リセット信号のタイミング。@<br>{}同じタイミングで実行される全ての代入文の右辺を評価した後@<br>{}にレジスタの値が変更される。
//}

//clearpage

==== モジュールのインスタンス化

あるモジュールを利用したいとき、
モジュールを@<b>{インスタンス化}(instantiate)することにより、
モジュールの実体を宣言できます。

モジュールは、@<b>{inst}キーワードによってインスタンス化できます
(@<list>{module.inst})。

//list[module.inst][ModuleAモジュール内でHalfAdderモジュールをインスタンス化する]{
module ModuleA {
	// モジュールと接続するための変数の宣言
	let x : logic = 0;
	let y : logic = 1;
	var s : logic;
	var c : logic;

	// inst インスタンス名 : モジュール名(ポートとの接続);
	inst ha1 : HalfAdder(
		x: x, // ポートxに変数xを接続する
		y: y,
		s,    // ポート名と変数名が同じとき、ポート名の指定を省略できる 
		c,
	);
}
//}

インスタンス名が違えば、
同一のモジュールを2つ以上インスタンス化できます。

==== パラメータ、定数

モジュールには、インスタンス化するときに変更可能な定数(@<b>{パラメータ})を用意できます。

モジュールのパラメータは、
ポート宣言の前の@<code>{#()}の中で@<b>{param}キーワードによって宣言できます
(@<list>{module.param.define})。

//list[module.param.define][モジュールのパラメータの宣言]{
module ModuleA #(
	// param パラメータ名 : 型名 = デフォルト値 
	param WIDTH : u32 = 100, // u32型のパラメータ
	param DATA_TYPE : type = logic, // type型のパラメータには型を指定できる
) (
	// ポートの宣言
) {}
//}

モジュールをインスタンス化するとき、
ポートの割り当てと同じようにパラメータの値を割り当てられます
(@<list>{module.param.inst})。

//list[module.param.inst][パラメータの値を指定する]{
inst ma : ModuleA #(
	// パラメータの割り当て
	WIDTH: 10,
	DATA_TYPE: logic<10>
) ( /* ポートの接続 */ );
//}

//clearpage

パラメータに指定する値は、合成時に確定する値(定数)である必要があります。

モジュール内では、変更不可能なパラメータ(定数)を定義できます。
定数を定義するには@<b>{const}キーワードを使用します
(@<list>{const.use})。

//list[const.use][定数の定義]{
// const 定数名 : 型名 = 式;
// 式に変数が含まれてはいけない
const SECRET : u32 = 42;
//}

=== ユーザー定義型

==== 構造体型

構造体(struct)とは、複数のデータから構成される型です。
例えば、@<list>{struct.define}のように記述すると、
@<code>{logic<32>}と@<code>{logic<16>}の2つのデータから構成される型を定義できます。

//list[struct.define][構造体型の定義]{
// struct 型名 { フィールドの定義 }
struct MyPair {
	// 名前 : 型
	word: logic<32>,
	half: logic<16>,
}
//}

構造体の要素(フィールド, field)には@<code>{.}を介してアクセスできます
(@<list>{struct.field.access})。

//list[struct.field.access][フィールドへのアクセス、割り当て]{
// 構造体型の変数の宣言
var pair: MyPair;

// フィールドにアクセスする
let w : logic<32> = pair.word;

// フィールドに値を割り当てる
always_comb {
	pair.word = 12345;
}
//}

==== 列挙型

複数の値の候補から値を選択できる型を作りたいとき、
@<b>{列挙型}(enumerable type)を利用できます。
列挙型の値の候補のことを@<b>{バリアント}(variant)と呼びます。

例えば、A、B、C、Dのいずれかのバリアントをとる型は次のように定義できます
(@<list>{enum.define})。

//list[enum.define][列挙型の定義]{
// enum 型名 : logic<バリアント数を保持できるだけのビット数> { バリアントの定義 }
enum abc : logic<2> {
	// バリアント名 : バリアントを表す値,
	A = 2'd0,
	B = 2'd1,
	C = 2'd2,
	D = 2'd3,
}
//}

バリアントを表す値や、バリアントを保持できるだけのビット数は省略できます
(@<list>{enum.omit})。

//list[enum.omit][列挙型の省略した定義]{
enum abc {
	A, B, C, D
}
//}

==== 配列

@<code>{<>}を使用することで、多次元の型を定義できます
(@<list>{logic.md})。
@<code>{<>}を使用して構成される型の要素は、
連続した領域に並ぶことが保証されます(@<img>{packed_array})。

//list[logic.md][多次元の型]{
logic<N>     // Nビットのlogic型
logic<A, B>  // BビットのlogicがA個並ぶ型
//}

//image[packed_array][<>の型の要素は連続した領域に並ぶ (例 : v[1\][0\]とv[0\][3\]が隣り合う)]

@<code>{[]}を使用することでも、多次元の型を定義できます
(@<list>{array.define})。
ただし、@<code>{[]}を使用して構成される型の要素は、
連続した領域に並ぶことが保証されません。

//list[array.define][配列型]{
// 型名[個数] で、"型名"型が"個数"個の配列になる
logic[32]     // 要素数が32のlogicの配列型
logic[4, 8]   // logicが8個の配列が4個ある配列型
//}

==== 型に別名をつける

@<b>{type}キーワードを使うと、型に別名を付けられます
(@<list>{type.define})。

//list[type.define][型に別名を付ける]{
// type 名前 = 型;
type ptr = logic<32>;
type ptr_array = ptr<32>;
//}

//clearpage

=== 式、文、宣言

==== ビット選択

//image[bitsel][ビット選択][width=50%]

変数の任意のビットを切り出すには@<code>{[]}を使用します(@<img>{bitsel})。
範囲の選択には@<code>{[:]}を使用します。
最上位ビット(most significant bit, MSB)は@<b>{msb}キーワード、
最下位ビット(least significant bit, LSB)は@<b>{lsb}キーワードで指定できます。
選択する場所の指定には式を使えます。

よく使われる範囲の選択には、別の書き方が用意されています
(@<list>{bitsel.range_sel})。

//list[bitsel.range_sel][範囲の選択の別の記法]{
v[s +: w]   // = v[s+w-1   : s    ]
v[s -: w]   // = v[s       : s-w+1]
v[i step w] // = v[i*(w+1) : i*w  ] = v[i*w +: w]
//}

==== 演算子

Verylでは、@<table>{operator.priority}の演算子を使用できます。
ほとんどの演算子と優先度は通常のプログラミング言語と同じですが、
ビット演算の種類が多かったり、
@<code>{x}と@<code>{z}を考慮した演算があるなどの違いがあります。

SystemVerilogとの差異を説明すると、
@<code>{++}、@<code>{--}、@<code>{:=}、@<code>{:/}、@<code>{<=}(代入)、@<code>{?:}(三項演算子)が無く、
@<code>{<}と@<code>{>}がそれぞれ@<code>{<:}と@<code>{>:}に変更されています。
また、@<code>{inside}と@<code>{{{\}\}}の形式が変更され、if式、case式、switch式が追加されています。

単項、二項演算子の使用例は次の通りです(@<list>{operator.use})。

//list[operator.use][単項、二項演算子 (Verylのドキュメントの例@<bib>{veryl-doc.operators}を改変)]{
// 単項算術演算
a = +1;
a = -1; // 正負を反転させる

// 単項論理演算
a = !1; // 否定 (真偽を反転させる)
a = ~1; // ビット反転 (0を1、1を0にする)

// 単項集約演算
//
// 集約: 左のビットから順に1ビットずつビット演算する
//   例: k = 3'b110のとき、&k = 0
//       &k = 1 & 1 & 0          
//       まず、k[msb]とk[1]をANDして1を得る。
//       次に、その結果とk[0]をANDして0を得る。
//       この値が&kの結果になる。
a = &1;  // AND
a = |1;  // OR
a = ^1;  // XOR
a = ~&1; // NAND
a = ~|1; // NOR
a = ~^1; // XNOR
a = ^~1; // XNOR

// 二項算術演算
a = k ** p; // kのp乗
a = 1 * 1;  // かけ算
a = 1 / 1;  // 割り算
a = 1 % 1;  // 剰余
a = 1 + 1;  // 足し算
a = 1 - 1;  // 引き算

// シフト演算
// 注意 : 右オペランド(シフト数)は符号無しの数として扱われる
a = k <<  n; // kをnビット左シフトする。空いたビットは0で埋める
a = k <<< n; // <<と同じ
a = k >>  n; // kをnビット右シフトする。空いたビットは0で埋める
a = k >>> n; // kが符号無しのとき>>と同じ。符号付きのとき、空いたビットはMSBで埋める

// 比較演算
a = n <: m;  // nはm未満
a = n <= m;  // nはm以下
a = n >: m;  // nはmよりも大きい (mを含まない)
a = n >= m;  // nはm以上 (mを含む)
a = n == m;  // nはmと等しい (xかzを含む場合、x)
a = n != m;  // nはmと等しくない (xかzを含む場合、x)
a = n === m; // nはmと等しい (xとzを含めて完全に一致)
a = n !== m; // nはmと等しくない (xとzを含めて完全に一致)
a = n ==? m; // ===と同じ。ただし、mに含まれるx,zはワイルドカードになる
a = n !=? m; // !(==?)と同じ

// ビット演算 (ビット単位, bitwise)
a = 1 & 1;  // ビット単位AND
a = 1 ^ 1;  // ビット単位XOR
a = 1 ~^ 1; // ビット単位XNOR
a = 1 ^~ 1; // ビット単位XNOR
a = 1 | 1;  // ビット単位OR

// 二項論理演算
a = x && y; // xとyの両方が真のとき真
a = x || y; // xまたはyが真のとき真
//}

//clearpage

#@# TODO 表

//table[operator.priority][演算子と優先度 @<bib>{veryl-doc.operator.precedence}]{
演算子	結合性	優先順位
==============================================
@<code>{()} @<code>{[]} @<code>{::} @<code>{.}																														左		高い
@<code>{+} @<code>{-} @<code>{!} @<code>{~} @<code>{&} @<code>{~&} @<code>{|} @<code>{~|} @<code>{^} @<code>{~^} @<code>{^~}(単項)									左
@<code>{**}																																							左
@<code>{*} @<code>{/} @<code>{%}																																	左
@<code>{+} @<code>{-} (二項)																																		左
@<code>{<<} @<code>{>>} @<code>{<<<} @<code>{>>>}																													左
@<code>{<:} @<code>{<=} @<code>{>:} @<code>{>=}																														左
@<code>{==} @<code>{!=} @<code>{===} @<code>{!==} @<code>{==?} @<code>{!=?}																							左
@<code>{&} (二項)																																					左
@<code>{^} @<code>{~^} @<code>{^~} (二項)																															左
@<code>{|} (二項)																																					左
@<code>{&&}																																							左
@<code>{||}																																							左
@<code>{=} @<code>{+=} @<code>{-=} @<code>{*=} @<code>{/=} @<code>{%=} @<code>{&=} @<code>{^=} @<code>{|=} @<code>{<<=} @<code>{>>=} @<code>{<<<=} @<code>{>>>=}	なし
@<code>{{\}} @<code>{inside} @<code>{outside} @<code>{if} @<code>{case} @<code>{switch}																				なし	低い
//}

==== if、switch、case

条件によって動作や値を変えたいとき、@<b>{if}文を使用します (@<list>{if.only})。
if文は式にできます。
if式は必ず値を返す必要があり、elseが必須です。

//list[if.only][if文、if式]{
var v : logic<32>;
always_comb {
	if WIDTH == 0 {
		// WIDTH == 0のとき
		v = 0;
	} else if WIDTH == 1 {
		// WIDTH != 0かつWIDTH == 1のとき
		v = 1;
	} else {
		// WIDTH != 0かつWIDTH != 1のとき
		v = if WIDTH == 3 { // ifは式にもなる
			3
		} else {
			// if式はelseが必須
			4
		};
	}
}
//}

always_combブロック内で変数に代入するとき、
if文の全ての場合で代入する必要があることに注意してください
(@<code>{v}は常に代入されています)。

@<list>{if.only}と同じ意味の文を@<b>{switch}文で書けます(@<list>{switch.only})。
どの条件にも当てはまらないときの動作は@<b>{default}で指定します。
switchは式にできます。
switch式は必ず値を返す必要があり、defaultが必須です。

//list[switch.only][switch文、switch式]{
var v : logic<32>;
always_comb {
	switch {
		// WIDTH == 0のとき
		WIDTH == 0: {
			v = 0;
		}
		// WIDTH != 0かつWIDTH == 1のとき
		WIDTH == 1: v = 1; // 要素が1つの文のとき、{}は省略できる
		// WIDTH != 0かつWIDTH != 1のとき
		default: 
			// switch式
			v = switch {
				WIDTH == 3: 3, // カンマで区切る
				default : 4, // switch式はdefaultが必須
			};
	}
}
//}

@<list>{if.only}のように
1つの要素(@<code>{WIDTH})の一致のみが条件のとき、
同じ意味の文を@<b>{case}文で書けます(@<list>{case.only})。
式にできたり、式にdefaultが必須なのはswitch文と同様です。

//list[case.only][case文、case式]{
var v: logic<32>;
always_comb {
	case WIDTH {
		// WIDTH == 0のとき
		0: {
			v = 0;
		}
		// WIDTH != 0かつWIDTH == 1のとき
		1: v = 1; // 要素が1つの文のとき、{}は省略できる
		// WIDTH != 0かつWIDTH != 1のとき
		default: 
			// case式
			v = case WIDTH {
				3: 3, // カンマで区切る
				default : 4, // case式はdefaultが必須
			};
	}
}
//}

==== 連結、repeat

ビット列や文字列を連結したいとき、@<code>{{\}}を使用できます(@<list>{renketu})。
@<code>{+}では連結できない(値の足し算になる)ことに注意してください。
同じビット列、文字列を繰り返して連結したいときは@<b>{repeat}キーワードを使用します(@<list>{repeat})。

//list[renketu][連結]{
{12'h123, 32'habcd0123} // 44'h123_abcde0123になる
{"Hello", " ", "World!"} // "Hello World!"になる
//}

//list[repeat][repeatを使って連結を繰り返す]{
// {繰り返したい要素 repeat 繰り返す回数}
{4'0011 repeat 3, 4'b1111} // 16'b0011_0011_0011_1111になる
{"Happy" repeat 3} // "HappyHappyHappy"になる
//}

==== for

@<b>{for}文はループを実現するための文です。
for文は@<list>{for.code}のように記述できます。
例えばループ変数が0から31になるまで(32回)繰り返すなら、
範囲に@<code>{0..32}、または@<code>{0..=31}と記述します。
範囲には定数のみ指定できます。

//list[for.code][for文の記法]{
// for ループ変数名: 型 in 範囲 { 処理 }
for i: u32 in 0..32 { ... }
//}

@<b>{break}文を使うとループから抜け出せます。
例えば@<list>{always_comb.for}では@<code>{x}の値は256になります。

//list[always_comb.for][always_combブロック内でfor文を記述する例]{
var x: u32;
always_comb {
    x = 0;
    for _: u32 in 0..1024 {
        if x == 256 {
            break;
        }
        x += 1;
    }
}
//}

==== inside、outside

値がある範囲に含まれているかという条件を記述したいとき、
@<b>{inside}式を利用できます。
@<code>{inside 式 {範囲\}}で、
式の結果が範囲内にあるかという条件を記述できます(@<list>{inside-outside})。
逆に、範囲外にあるという条件は@<b>{outside}式で記述できます。

//list[inside-outside][inside、outside]{
inside n {0..10}    // nが0以上10未満のとき1
inside n {0..=10}   // nが0以上10以下のとき1
inside n {0, 1, 3}  // nが0、1、3のいずれかのとき1
inside n {0, 2..10} // nが0、または2以上10未満のとき1

// outsideはinsideの逆
outside n {0..10}   // nが0未満、または10より大きいとき1
outside n {0, 1, 3} // nが0、1、3以外の値のとき1
//}

==== function

何度も記述する操作や計算は、関数(@<b>{function})を使うことでまとめて記述できます(@<list>{function.first})。
関数は値を引数で受け取り、@<b>{return}文で値を返します。
値を返さないとき、戻り値の型の指定を省略できます。

引数には向きを指定できます。
functionの実行を開始するとき、
@<code>{input}として指定されている実引数の値が仮引数にコピーされます。
functionの実行が終了するとき、
@<code>{output}として指定されている仮引数の値が実引数の変数にコピーされます。
outputを使用することで、変数に値を割り当てることができます。

//list[function.first][関数]{
// べき乗を返す関数
function get_power(
	a : input u32,
	b : input u32,
) -> u32 {
	return a ** b;
}

val v1 : logic<32>;
val v2 : logic<32>;

always_comb {
	v1 = get_power(2, 10); // v1 = 1024
	v2 = get_power(3, 3); // v2 = 27
}



// a + 1をbに代入する関数
function assign_plus1(
	a : input  logic<32>,
	b : output logic<32>,
) { // 戻り値はないので省略
	b = a + 1;
}

val v3 : logic<32>;

always_comb {
	assign_plus1(v1, v3); // v3 = v1 + 1
}
//}

=== interface

モジュールに何個もポートが存在するとき、
ポートの接続は非常に手間のかかる作業になります。
例えば@<list>{interface.motivate}では、
向きが対になっているポートがModuleAとModuleBに定義されており、
これを一つ一つ接続しています。

//list[interface.motivate][モジュールのポートの相互接続]{
module ModuleA (
	req_a: output logic,
	req_b: output logic,
	req_c: output logic,
){}
module ModuleB (
	resp_a: input logic,
	resp_b: input logic,
	resp_c: input logic,
){}
module Top{
	var a: logic;
	var b: logic;
	var c: logic;
	inst ma : ModuleA (
		req_a:a,
		req_b:b,
		req_c:c,
	);
	inst mb : ModuleB (
		resp_a:a,
		resp_b:b,
		resp_c:c,
	);
}
//}

モジュール間のポートの接続を簡単に行うために、
インターフェース(@<b>{interface})という機能が用意されています。
@<list>{interface.motivate}のModuleAとModuleBを相互接続するような
インターフェースは次のように定義できます(@<list>{interface.example})。

//list[interface.example][インターフェースの定義]{
// interface インターフェース名 { }
interface iff_ab {
	var a : logic;
	var b : logic;
	var c : logic;

	modport req {
		a: input,
		b: input,
		c: input,
	}
	modport resp {
		a: output,
		b: output,
		c: output,
	}
}
//}

iff_abインターフェースを利用すると、
@<list>{interface.motivate}を簡潔に記述できます
(@<list>{interface.good})。

//list[interface.good][インターフェースによる接続]{
module ModuleA (
	req : modport iff_ab::req,
){}
module ModuleB (
	resp : modport iff_ab::resp,
){}
module Top{
	// インターフェースのインスタンス化
	inst iab : iff_ab;
	inst ma : ModuleA (req: iab);
	inst mb : ModuleB (resp: iab);
}
//}

インターフェースはポートの宣言と接続を抽象化します。
インターフェース内に変数を定義すると、
@<b>{modport}文によってポートと向きを宣言できます。
モジュールでのポートの宣言は、@<code>{ポート名 : @<b>|modport| インターフェース名::modport名}と記述できます。
modportで宣言されたポートにインターフェースのインスタンスを渡すことにより、
ポートの接続を一気に行えます。

モジュールと同じように、インターフェースにはパラメータを宣言できます(@<list>{interface.param})。

//list[interface.param][パラメータ付きのインターフェース]{
// interface インターフェース名 #( パラメータの定義 ) { }
interface iff_params # (
	param PARAM_A : u32 = 100,
	param PARAM_B : u64 = 200,
){ }
//}

インターフェース内には関数の定義やalways_combブロック、always_ffブロックなどの文を記述できます。

=== package

複数のモジュールやインターフェースにまたがって使用したい
パラメータや型、関数はパッケージ(@<b>{package})に定義できます
(@<list>{package.define})。

//list[package.define][パッケージの定義]{
package PackageA {
	const WIDTH : u32 = 1234;
	type foo = logic<WIDTH>;
	function bar () -> u32 {
		return 1234;
	}
}
//}

パッケージに定義した要素には、
@<code>{パッケージ名::要素名}でアクセスできます
(@<list>{package.access})。

//list[package.access][パッケージの要素にアクセスする]{
module ModuleA {
	const W : u32 = PackageA::WIDTH;
	var value1 : PackageA::foo;
	let value2 : u32 = PackageA::bar();
}
//}

@<b>{import}文を使用すると、
要素へのアクセス時にパッケージ名の指定を省略できます
(@<list>{package.import})。

//list[package.import][パッケージをimportする]{
import PackageA::WIDTH; // 特定の要素をimportする
import PackageA::*; // 全ての要素をimportする
//}

=== ジェネリクス

関数やモジュール、インターフェース、パッケージ、構造体は
@<b>{ジェネリクス}(generics)によってパラメータ化できます。

例えば、要素に任意の型TやWビットのデータを持つ構造体は、
次のように@<b>{ジェネリックパラメータ}(generic parameter)を使うことで定義できます(@<list>{generics.sample})。
ジェネリックパラメータに渡される値は、
ジェネリクスの定義位置からアクセスできる定数である必要があります。

//list[generics.sample][パラメータ化された構造体]{
module ModuleA {
	// ::<>でジェネリックパラメータを定義する
	// constで数値を受け取る
	struct StructA::<W: const> {
	    A: logic<W>,
	}

	// 複数のジェネリックパラメータを定義できる
	// typeで型を受け取る
	// デフォルト値を設定できる
	struct StructB::<W: const, T: type, D:const = 100> {
		A: logic<W>,
		B: T,
		C: logic<D>
	}

	// ::<>でジェネリックパラメータを指定する
	type A = StructA::<16>;
	type B = StructB::<17, A>;
	type C = StructB::<18, B, 19>;
}
//}

//clearpage

=== その他の機能、文

==== initial、final

@<b>{initial}ブロックの中の文はシミュレーションの開始時に実行されます。
@<b>{final}ブロックの中の文はシミュレーションの終了時に実行されます(@<list>{initial.final})。

//list[initial.final][initial、finalブロック]{
module ModuleA {
	initial {
		// シミュレーション開始時に実行される
	}
	final {
		// シミュレーション終了時に実行される
	}
}
//}

==== SystemVerilogとの連携

SystemVerilogのモジュールやパッケージ、インターフェースを利用できます。
SystemVerilogのリソースにアクセスするには@<code>{$sv::}を使用します(@<list>{sv.use})。

//list[sv.use][SystemVerilogの要素を利用する]{
module ModuleA {
	// SystemVerilogでsvpackageとして
	// 定義されているパッケージを利用する
	let x = $sv::svpackage::X;
	let y = $sv::svpackage::Y;

	var s: logic;
	var c: logic;

	// SystemVerilogでHalfAdderとして
	// 定義されているモジュールをインスタンス化する
	inst ha : $sv::HalfAdder(
		x, y, s, c
	);

	// SystemVerilogでsvinterfaceとして
	// 定義されているインターフェースをインスタンス化する
	inst c: $sv::svinterface;
}
//}

SystemVerilogのソースコードを直接埋め込み、展開できます
(@<list>{sv.integrate})。

//list[sv.integrate][SystemVerilog記述を埋め込む]{
// SystemVerilog記述を直接埋め込む
embed (inline) sv{{{
	module ModuleA(
		output logic a
	);
		assign a = 0;
	endmodule
}}}

// SystemVerilogのソースファイルを展開する
// パスは相対パス
include(inline, "filename.sv");
//}

==== システム関数、システムタスク

SystemVerilogに標準で用意されている関数(システム関数、システムタスク)を利用できます。
システム関数(system function)とシステムタスク(system task)の名前は@<code>{$}から始まります。
本書で利用するシステム関数とシステムタスクを@<table>{systemtasks}に列挙します。

//table[systemtasks][本書で使用するシステム関数、システムタスク]{
関数名		機能		戻り値
===============================================================
$clog2		値のlog2のceilを求める					数値
$size		配列のサイズを求める					数値
$bits		値の幅を求める							数値
$signed		値を符号付きとして扱う					符号付きの値
$readmemh	レジスタにファイルのデータを代入する	なし
$display	文字列を出力する						なし
$error		エラー出力する							なし
$finish		シミュレーションを終了する				なし
//}

それぞれの使用例は次の通りです(@<list>{systemtask.use})。
システム関数やシステムタスクを利用するときは、通常の関数呼び出しのように使用します。

//list[systemtask.use][システム関数、システムタスクの使用例]{
const w1 : u32 = $clog2(32); // 5
const w2 : u32 = $clog2(35); // 6

var array : logic<4,8>;
const s1 : u32 = $size(array); // 4
const s2 : u32 = $bits(array); // 32

var uvalue : u32;
let svalue : i32 = $signed(uvalue) + 1;

initial {
	$readmemh("file.hex", array);
	$display("Hello World!");
	$error("Error!");
	$finish();
}
//}

==== アトリビュート

アトリビュートを使うと、宣言に注釈をつけられます。
例えば@<list>{attribute.use}は、@<list>{attribute.sv}にトランスパイルされます。

//list[attribute.use][アトリビュートを使ったVerylコード]{
#[sv("keep=\"true\"")]
var aaa : logic;

#[ifdef(IS_DEBUG)]
var bbb : logic;

#[ifndef(TEST)]
var ccc : logic;
//}

//list[attribute.sv][同じ意味のSystemVerilogコード]{
(* keep="true" *)
logic aaa;

`ifdef IS_DEBUG
logic bbb;
`endif

`ifndef TEST
logic ccc;
`endif
//}

@<code>{#[sv()]}は、宣言にSystemVerilogの属性を付けられます。
属性は使用するときに説明します。
@<code>{#[ifdef(マクロ名)]}をつけられた宣言は、
マクロが存在するときにのみ定義されるようになります。
@<code>{#[ifndef(マクロ名)]}はその逆で、
マクロが存在しないときにのみ定義されるようになります。

アトリビュートはポートやパラメータ、ブロック、モジュール、インターフェース、パッケージなど、どの宣言にも付けることができます。

==== 標準ライブラリ

Verylには、よく使うモジュールなどが標準ライブラリとして準備されています。
標準ライブラリは@<href>{https://std.veryl-lang.org/}で確認できます。

本書では標準ライブラリを使用していないため、説明は割愛します。