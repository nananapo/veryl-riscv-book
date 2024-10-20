= ハードウェア記述言語 Veryl

=={hdl} ハードウェア記述言語

CPUを記述するといっても、
いったいどうやって記述するのでしょうか?
まずは、論理回路を構成する方法から考えます。

=== 論理回路の構成

@<b>{論理回路}とは、
デジタル(例えば0と1だけ)なデータを利用して、データを加工、保持する回路のことです。
論理回路は、組み合わせ回路と順序回路に分類することができます。

@<b>{組み合わせ回路}とは、
入力に対して、一意に出力の決まる回路@<bib>{ronrikairo}のことです。
例えば、@<img>{halfadder}は半加算器です。
半加算器とは1ビットの加算を行う回路で、
入力X, Yが決まると、出力C, Sが一意に決まります(@<table>{halfadder.truth})。

//image[halfadder][半加算器 (MIL記法)][width=45%]

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
よって、このカウンタは入力と状態によって一意に出力の決まる順序回路です。

1ビットの値はフリップフロップという回路によって保持することができます。
フロップフロップをN個並列に並べると、
Nビットの値を保持することができます。
フリップフロップを並列に並べた記憶装置のことを、@<b>{レジスタ}(register, 置数器)と呼びます。
基本的に、レジスタの値は@<b>{リセット信号}(reset)によって初期化し、
@<b>{クロック信号}(clock)に同期したタイミングで変更します。

//image[downcounter][カウンタ][width=70%]

論理回路を設計するには、真理値表を作成し、
それを実現する論理演算を構成します。
入力数や状態数が数十個ならどうにか人力で設計できるかもしれませんが、
数千, 数万の入力や状態があるとき、
手作業で設計するのはほとんど不可能です。
これを設計するために、ハードウェア記述言語を利用します。

=== ハードウェア記述言語

@<b>{ハードウェア記述言語}(Hardware Description Language, HDL)とは、
デジタル回路を設計するための言語です。

例えばHDLであるSystemVerilogを利用すると、
半加算器は@<list>{halfadder.sv}のように記述することができます。

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
入力としてx, yを受け取り、
出力c, sにx, yを使った演算を割り当てます。

また、レジスタを利用した回路を@<list>{counter.sv}のように記述することができます。
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
      // clkが1になったとき、countの値をcount + 1にする
      count <= count + 1;
    end
  end
endmodule
//}

HDLを使用すると、論理回路を、
レジスタの値と入力値を使った組み合わせ回路と、
その結果をレジスタに値を格納する操作として記述できます。
このような、レジスタからレジスタに、
組み合わせ回路を通したデータを転送する抽象度のことを
@<b>{レジスタ転送レベル}(Register Transfer Level, RTL)と呼びます。

HDLで記述された論理回路は、
@<b>{合成系}によって、
RTLから実際の回路のデータに変換(@<b>{合成})されます。

=== Veryl

メジャーなHDLといえば、Verilog HDL, SystemVerilogなどが挙げられます@<fn>{vhdl}。

//footnote[vhdl][VHDLが無いじゃないかと思った方、すみません。VHDLのことを私はよく知らないので無いことにしました。]

Verilog HDL(Verilog)は1980年代に開発された言語であり、
最近のプログラミング言語と比べると機能が少なく、冗長な記述が必要です。
SystemVerilogはVerilogのスーパーセットです。
言語機能が増えて便利になっていますが、
スーパーセットであることから、
あまり推奨されない古い書き方が可能だったり、
(バグの原因となるような)良くない仕様@<fn>{nettype}を受け継いでいます。

//footnote[nettype][例えば、未定義の変数が1ビット幅の信号線として解釈される仕様があります。ヤバすぎる]

本書では、CPUの実装にVerylというHDLを使用します。
Verylは2022年12月に公開された言語です。
Verylの抽象度は、Verilogと同じくレジスタ転送レベルです。
Verylの文法や機能は、Verilog, SystemVerilogに似通ったものになっています。
しかし、
if式やcase式, 
クロックとリセットの抽象化, 
ジェネリクスなど、
痒い所に手が届く機能が提供されており、
高い生産性を発揮します。

Verylプログラムは、
コンパイラ(トランスパイラ)によって、
自然で読みやすいSystemVerilogプログラムに変換されます。
よって、Verylは旧来のSystemVerilogの環境と共存することができ、
SystemVerilogの資産を利用することができます。

//caution[注意]{
本書は2024/10/19時点のVeryl(バージョン0.13.1)について、
本書で利用する範囲の文法, 機能を解説しています。
Verylはまだ開発途上(正式版, 安定版がリリースされていない)状態の言語です。
破壊的変更が入り、記載しているコードが使えなくなる可能性があります。

本書に記載しているコードの中には、
バージョン0.13.1では不具合によって実行できないものがあります。
不具合の回避手段についてはサポートページ@<fn>{support}をご覧ください。
また、最新のVerylに対応した解説はweb版, pdf版を確認してください。
//}

//footnote[support][@<w>{support-page}]

== Verylの基本文法, 機能

それでは、Verylの書き方を簡単に学んでいきましょう。
Verylのドキュメントは@<href>{https://doc.veryl-lang.org/book/ja/}に存在します。
また、@<href>{https://doc.veryl-lang.org/playground/, Veryl Playground}では、
VerylプログラムのSystemVerilogプログラムへのトランスパイルを試すことができます。

=== コメント, 空白

Verylでは次のようにコメントを記述することができます(@<list>{code.comment})。

//list[code.comment][コメント]{
  // 1行のコメント
  /* 範囲コメント */
//}

=== 値, リテラル

論理回路では、デジタルな値を扱います。
デジタルな値は@<code>{0}と@<code>{1}の二値(2-state)で表現されますが、
一般的なハードウェア記述言語では、
@<code>{0}と@<code>{1}に@<code>{x}, @<code>{z}を加えた四値(4-state)が利用されます(@<table>{table.fourstate})。

//table[table.fourstate][4-stateの値]{
値	意味						真偽
-------------------------------------------------------------
0	0				偽
1	1				真
x	unknown			偽
z	high-inpedance	偽
//}

@<b>{不定値}(unknown value)とは、0か1のどちらか分からない値です。
不定値は、
未初期化のレジスタの値の表現に利用されたり、
不定値との演算の結果として生成されます。
@<b>{ハイインピーダンス}(high-inpedance)とは、
どのレジスタ, 信号とも接続されていないことを表す値です。
物理的なハードウェア上では、全ての値は0か1の二値として解釈されます。
不定値とハイインピーダンスはシミュレーションのときにのみ利用されます。

1ビットの四値を表現するための型は@<b>{logic}です。
Nビットのlogic型は@<b>{logic<N>}のように記述することができます。
1ビットの二値を表現する型は@<b>{bit}です。
基本的に、レジスタや信号の定義にbit型は利用せず、logic型を利用します。

logic, bit型は、デフォルトで符号が無い型として扱われます。
符号付き型として扱いたいときは、
型名の前に@<b>{signed}キーワードを追加します
(@<list>{code.signed_keyword})。

//list[code.signed_keyword][符号付き型]{
signed logic<4> // 4ビットの符号付きlogic型
signed bit<2> // 2ビットの符号付きbit型
//}

32, 64ビットのbit型を表す型が定義されています(@<table>{ui3264})。

//table[ui3264][整数型]{
型名	等価な型
-------------------------------------------------------------
u32		bit<32>
u64		bit<64>
i32		signed bit<32>
i64		signed bit<64>
//}


数値は@<list>{code.num_literal}のように記述することができます。

//list[code.num_literal][数値リテラル]{
4'b0101 // 4ビットの数値 (2進数表記)
4'bxxzz // 4ビットの数値 (2進数表記)

12'o34xz // 12ビットの数値 (8進数表記)
32'h89abcdef // 32ビットの数値 (16進数表記)

123 // 10進数の数値
32'd12345 // 32ビットの数値 (10進数表記)

// 数値リテラルの好きな場所に_を挿入できる
1_2_34_567

// x, zは大文字でも良い
4'bxXzZ

// 全ビット0, 1, x, zにする
'0
'1
'x
'z

// 指定したビット幅だけ0, 1, x, zにする
8'0 // 8ビット0
8'1 // 8ビット1
8'x // 8ビットx
8'z // 8ビットz

// 幅を指定しない場合、幅が自動で推定される
'hffff // 16ビット
'h1fff // 13ビット
//}

文字列は@<b>{string}型で表現することができます。
文字列の値は@<list>{string.literal}のように記述することができます。

//list[string.literal][文字列リテラル]{
"Hello World!" // 文字列リテラル 
"abcdef\nabc"  // エスケープシーケンスを含む文字列リテラル
"あうあうあー"  // 日本語も入力できる
//}

=== module

HDLによる論理回路は@<b>{モジュール}(Module)というコンポーネントで構成されます。
例えば、半加算器のモジュールは次のように定義できます(@<list>{halfadder.veryl}).

//list[halfadder.veryl][半加算器(HalfAdder)モジュール]{
module HalfAdder (
    x: input  logic, // 1ビットのlogic型の入力
    y: input  logic, // 1ビットのlogic型の入力
    s: output logic, // 1ビットのlogic型の出力
    c: output logic, // 1ビットのlogic型の出力
) {
    always_comb {
        s = x ^ y; // sにx XOR yを割り当てる
        c = x & y; // cにx AND yを割り当てる
    }
}
//}

HalfAdderモジュールには、
入力変数として@<code>{x}, @<code>{y}、
出力変数として@<code>{s}. @<code>{c}が宣言されています。
入出力の変数のことを@<b>{接続ポート}、または単に@<b>{ポート}と呼びます。

入力ポートを定義するとき、モジュール名の後の括弧の中に、
@<code>{変数名 : input 型名}と記述します。
出力ポートを宣言するときは@<code>{input}の代わりに@<code>{output}と記述します。
複数のポートを宣言するとき、宣言の末尾にカンマ(@<code>{,})を記述します。

==== 変数の宣言, 代入

HalfAdderモジュールでは、
@<b>{always_comb}ブロックで出力変数
@<code>{s}, @<code>{c}に値を代入しています。
変数への代入は@<code>{変数名 = 式;}で行います。

always_combブロック内で値を代入すると、
代入される式は組み合わせ回路になります。

always_combブロックの中での代入の代わりに、
@<b>{assign}文でも代入することができます(@<list>{assign})。

//list[assign][assign文による代入]{
// 下のalways_combと同じ意味になる
assign s = a ^ c;
assign c = a & c;

// always_combによる代入
always_comb {
	s = a ^ c;
	c = a & c;
}
//}

通常のプログラミング言語での代入とは、スタック領域やレジスタに存在する変数に値を格納することです。
これに対して、always_combブロックの中での代入やassign文による代入は変数に式(値)を@<b>{束縛}します。
変数に式が束縛されると、
式が評価(計算)された値が変数に1度だけ代入されるのではなく、
変数の値は常に式の計算結果になります。

具体例で考えてみます。
例えば、1ビットの変数xに1ビットの変数yをassign文で割り当てます
(@<list>{assign.wave})。

//list[assign.wave][xにyを割り当てる]{
assign x = y;
//}

yの値が時間経過により0, 1, 0, 1, 0というように遷移したとします。
このとき、xの値はyが変わるのと同時に変化します。
@<img>{assign_wave}は、横軸が時間で、xとyの値を線の高低で表しています。
@<img>{assign_wave}のような図を波形図(waveform, 波形)と呼びます。

xにyではなくa + bを割り当てるとすると、aかbの変化をトリガーにxの値も変化します。

//image[assign_wave][xはyの値の変化に追従する][width=60%]

モジュールの中では、
@<b>{var}文によって新しく変数を宣言することができます(@<list>{var.stmt})。

//list[var.stmt][変数の宣言]{
// var 変数名 : 型名;
var value : logic<32>;
//}

var文によって宣言した変数は、
assign文, またはalways_comb内での代入によって、
式を束縛することができます。

@<b>{let}文を使うと、
変数の宣言と値の代入を同時に行うことができます。

//list[let.stmt][変数の宣言と代入]{
// let 変数名 : 型名 = 式;
let value : logic<32> = 100 + a;
//}

==== レジスタの定義, 代入

変数を宣言するとき、
変数に式が束縛されない場合、
変数はレジスタとして解釈できます
(@<list>{reg.define})。

//list[reg.define][レジスタの定義]{
// var レジスタ名 : 型名;
var reg_value : logic<32>;

// always_combブロックの中での代入や、assign文での代入をしない
//}

本書では、レジスタのことを変数,
または変数のことをレジスタと呼ぶことがあります。

レジスタの値はクロック信号に同期したタイミングで変更し、
リセット信号に同期したタイミングで初期化します(例:@<img>{register_wave})。
本書では、
クロック信号が@<b>{立ち上がる}(0から1に変わる)タイミングでレジスタの値を変更し、
リセット信号が@<b>{立ち下がる}(1から0に変わる)タイミングでレジスタの値を初期化することとします。

//image[register_wave][レジスタ(value)の値はクロック信号(clk)が立ち上がるタイミングで変わる][width=50%]

レジスタの値は、@<b>{always_ff}ブロックで初期化, 変更します(@<list>{always_ff.first})。
always_ffブロックにはクロック信号名とリセット信号名を指定します。

//list[always_ff.first][レジスタの値の初期化と変更]{
// レジスタの定義
var value : logic<32>;

// always_ff(クロック信号名, リセット信号名)
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

クロック信号はclock型, リセット信号はreset型で定義します。
モジュールのポートにクロック信号とリセット信号が定義されているとき、
always_ffブロックのクロック信号とリセット信号の指定を省略できます
(@<list>{always_ff.omit})。

//list[always_ff.omit][クロック信号とリセット信号の推論]{
module ModuleA(
  clk: input clock,
  rst: input reset,
){
	// always_ff(clk, rst)と等しい
	always_ff {}
}
//}

1つのalways_ffブロックで、複数のレジスタの値を変更することができます。
always_ffブロックの中で複数のレジスタの値を変更する時、
全ての代入は同時に行われます。

//list[always_ff.nonblocking][代入のタイミングは同じ]{
always_ff {
	if_reset {
		...
	} else {
		// 2つの代入文が同時に実行される。
		// その結果、AとBの値が入れ替わる
		A = B;
		B = A;
	}
}
//}

2つ以上のalways_ffブロックで、
1つの同じレジスタの値を変更することはできません@<fn>{clockdomain}。

//footnote[clockdomain][正確には可能ですが、本書では扱っていません]

==== モジュールのインスタンス化

あるモジュールを利用したいとき、
モジュールを@<b>{インスタンス化}(instantiate)することにより、
モジュールのインスタンスを宣言することができます。

モジュールは、@<b>{inst}キーワードによってインスタンス化することができます
(@<list>{module.inst})。

//list[module.inst][ModuleAモジュール内でHalfAdderモジュールをインスタンス化する]{
module ModuleA{
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
同一のモジュールを2つ以上インスタンス化することができます。

==== パラメータ, 定数

モジュールには変更可能な値(@<b>{パラメータ})を用意することができ、
モジュールをインスタンス化するときにパラメータの値を指定することができます。

モジュールのパラメータは、
ポート宣言の前に@<b>{param}キーワードによって宣言することができます
(@<list>{module.param.define})。

//list[module.param.define][モジュールのパラメータの宣言]{
module ModuleA (
	// param パラメータ名 : 型名 = デフォルト値 
	param WIDTH : u32 = 100, // u32型のパラメータ
	param DATA_TYPE : type = logic, // type型のパラメータには型を指定できる
) (
	// ポートの宣言
) {}
//}

モジュールをインスタンス化するとき、
ポートの割り当てと同じようにパラメータの値を割り当てることができます
(@<list>{module.param.inst})。

//list[module.param.inst][パラメータの値を指定する]{
inst ma : ModuleA #(
	// パラメータの割り当て
	WIDTH: 10,
	DATA_TYPE: logic<10>
) (
	// ポートの接続
);
//}

パラメータに指定する値は、合成時に確定する値(定数)である必要があります。

モジュール内では、変更不可能なパラメータ(定数)を定義することができます。
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
logic<32>とlogic<16>の2つのデータから構成される型を定義することができます。

//list[struct.define][構造体型の定義]{
// struct 型名 { フィールドの定義 }
struct MyPair {
    // 名前 : 型
    word: logic<32>,
    half: logic<16>,
}
//}

構造体の要素(フィールド, field)には、@<code>{.}を介してアクセスすることができます
(@<list>{struct.field.access})。

//list[struct.field.access][フィールドへのアクセス, 割り当て]{
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
@<b>{列挙型}(enumerable type)を利用することができます。
列挙型の値の候補名のことを@<b>{バリアント}(variant)と呼びます。

例えば、A, B, C, Dのいずれかのバリアントをとる型は次のように定義できます
(@<list>{enum.define})。

//list[enum.define][列挙型の定義]{
// enum 型名 : logic<バリアント数を保持できるだけのビット数> { バリアントの定義 }
enum abc : logic<2> {
    // バリアント名 : バリアントを表す値,
    A = 2'd0,
    B = 2'd1,
    C = 2'd2,
    D = 2'd3
}
//}

バリアントを表す値や、バリアントを保持できるだけのビット数は省略することができます
(@<list>{enum.omit})。
省略された値は自動で推定されます。

//list[enum.omit][列挙型の省略した定義]{
enum abc {
    A, B, C, D
}
//}

==== 配列

@<code>{<>}を使用することで、多次元の型を定義することができます
(@<list>{logic.md})。

//list[logic.md][多次元の型]{
logic        // 1ビットのlogic
logic<N>     // Nビットのlogic
logic<A, B>  // A * Bの2次元のlogic
//}

@<code>{[]}を使用することで、配列を定義することができます
(@<list>{array.define})。

//list[array.define][配列型]{
// 型名[個数] で、"型名"型が"個数"個の配列型になる
logic[32]     // 32個のlogicが並ぶ型
logic[4, 8]   // logicが8個並ぶ配列が4個並ぶ配列型
//}

==== 型に別名をつける

@<b>{type}キーワードを使うと、型に別名を付けることができます
(type.define)。

//list[type.define][型に別名を付ける]{
// type 名前 = 型;
type ptr        = logic<32>;
type ptr_array  = ptr<32>
//}

=== 式, 文, 宣言

==== 演算子

Verylでは、次の演算子を使用することができます(@<list>{operator})。

TODO

//list[operator][単項演算子, 二項演算子]{
これはdocからのコピペ

// 単項算術演算
a = +1;
a = -1;

// 単項論理演算
a = !1;
a = ~1;

// 単項集約演算
a = &1;
a = |1;
a = ^1;
a = ~&1;
a = ~|1;
a = ~^1;
a = ^~1;

// 二項算術演算
a = 1 ** 1;
a = 1 * 1;
a = 1 / 1;
a = 1 % 1;
a = 1 + 1;
a = 1 - 1;

// シフト演算
a = 1 << 1;
a = 1 >> 1;
a = 1 <<< 1;
a = 1 >>> 1;

// 比較演算
a = 1 <: 1;
a = 1 <= 1;
a = 1 >: 1;
a = 1 >= 1;
a = 1 == 1;
a = 1 != 1;
a = 1 === 1;
a = 1 !== 1;
a = 1 ==? 1;
a = 1 !=? 1;

// ビット演算
a = 1 & 1;
a = 1 ^ 1;
a = 1 ~^ 1;
a = 1 ^~ 1;
a = 1 | 1;

// 二項論理演算
a = 1 && 1;
a = 1 || 1;
//}

==== ビット選択

//image[bitsel][ビット選択][width=50%]

変数の任意のビットを切り出すには@<code>{[]}を使用します(@<img>{bitsel})。
範囲の指定には@<code>{[:]}を使用します。
最上位ビット(most significant bit)は@<b>{msb}キーワード,
最下位ビット(least significant bit)は@<b>{lsb}キーワードで指定することができます。
選択する場所の指定には式を使うことができます。

==== if, switch, case

TODO
式と文

==== 連結, repeat

ビット列や文字列を連結したいときは@<code>{\{\}}を使用することができます(@<list>{renketu})。
@<code>{+}では連結できない(値の足し算になる)ことに注意してください。

//list[renketu][連結]{
{12'h123, 32'habcd0123} // 44'h123_abcde0123になる
{"Hello", " ", "World!"} // "Hello World!"になる
//}

同じビット列, 文字列を繰り返して連結したいとき、@<b>{repeat}キーワードを使用します
(@<list>{repeat})。

//list[repeat][repeatを使って、連結を繰り返す]{
{4'0011 repeat 3, 4'b1111} // 16'b0011_0011_0011_1111になる
{"Happy" repeat 3} // "HappyHappyHappy"になる
//}

==== for ..=
TODO

==== function
TODO

==== initial, final

@<b>{initial}ブロックの中の文は、シミュレーションの開始時に実行されます。
@<b>{final}ブロックの中の文は、シミュレーションの終了時に実行されます。

//list[initial.final][initial, finalブロック]{
module ModuleA {
    initial {
		// シミュレーション開始時に実行される
    }
    final {
		// シミュレーション終了時に実行される
    }
}
//}

=== interface
TODO

楽に済ますよ

定義, パラメータも使えます

modportでらくちんの例

インスタンス化する例

=== package
TODO

const, type, function

import

=== ジェネリクス
TODO

 * function
 * module
 * interface
 * package

=== その他の機能

==== SystemVerilogとの連携

VerylはSystemVerilogのモジュールやパッケージ, インターフェースを利用することができます。
SystemVerilogのリソースにアクセスすには@<b>{$sv::}キーワードを使用します。

//list[sv.use][SystemVerilogの要素を利用する]{
module ModuleA {
	// SystemVerilogプログラムでsvpackageとして
	// 定義されているパッケージを利用する
	let x = $sv::svpackage::X;
	let y = $sv::svpackage::Y;

	var s: logic;
	var c: logic;

	// SystemVerilogプログラムでHalfAdderとして
	// 定義されているモジュールをインスタンス化する
	inst ha : $sv::HalfAdder(
		x, y, s, c
	);

	// SystemVerilogプログラムでsvinterfaceとして
	// 定義されているインターフェースをインスタンス化する
    inst c: $sv::svinterface;
}
//}

SystemVerilogプログラムを直接埋め込み、含めることができます
(@<list>{sv.integrate})。

//list[sv.integrate][SystemVerilogプログラムを埋め込む]{
// SystemVerilogプログラムを直接埋め込む
embed (inline) sv{{{
    module ModuleA(
		output logic a
	);
		assign a = 0;
    endmodule
}}}

// SystemVerilogプログラムのファイルを展開する
// パスは相対パス
include(inline, "filename.sv");
//}

==== システム関数 / システムタスク

SystemVerilogに標準で用意されている関数(システム関数, システムタスク)を利用することができます。
システム関数(system function), システムタスク(system task)の名前は、@<code>{$}から始まります。
本書で利用するシステム関数, システムタスクを@<table>{systemtasks}に列挙します。
それぞれの使用例は次の通りです(@<list>{systemtask.use})。

システム関数, システムタスクを利用するときは、通常の関数呼び出しのように使用します。

//list[systemtask.use][システム関数, システムタスクの使用例]{
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

//table[systemtasks][本書で使用するシステム関数, システムタスク]{
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

==== 標準ライブラリ

Verylには、よく使うモジュールなどが標準ライブラリと準備されています。
標準ライブラリは@<href>{https://std.veryl-lang.org/}で確認することができます。

本書では標準ライブラリを使用していないため、説明は割愛します。