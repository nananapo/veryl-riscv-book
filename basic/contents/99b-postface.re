= あとがき

いかがだったでしょうか。

本書(基本編)はこれで終わりになります。
だいぶ駆け足になってしまいましたが、RISC-VのCPUの具体的な書き方が分かったかと思います。

基本編ではRISC-VのCPUをゼロから書き始め、Linuxを起動できるくらいの基本的な機能を実装する方法を解説しました。
しかし、Linuxを起動できるといっても速度や機能は現代的なCPUに遠く及びません。
次巻の「Verylで作るCPU 応用編」ではキャッシュ、アウトオブオーダー実行などを実装し、
CPUの高速化と他の機能について解説する予定です。

教科書を読んでなんとなくCPUを理解した気がするけど作り方がわからない、
既存のCPU実装を参考に自分でCPUを書いてみたいけど何から作れば良いかわからない、
という方に本書が役立つことを願っています。

2025年5月28日

//blankline

==[notoc] 著者について

//sideimage[tw-icon][18mm][side=L,sep=7mm,border=on]{
//noindent
@<large>{@<strong>{阿部奏太} (kanataso)}
@<small>{(@<hlink>{https://twitter.com/kanapipopipo, kanapipopipo@X/Twitter}, @<hlink>{https://github.com/nananapo, nananapo@GitHub})}
//noindent
カラオケまねきねこダイヤモンド会員 (3期目)@<br>{}
最近はキョーちゃん(有斐閣のキャラクター)が気になっている。@<br>{}
今後数年間はCPUから逃げられなくなりました。@<br>{}
//}

//blankline

==[notoc] 謝辞

本書を執筆するにあたって、石谷太一氏(@<href>{https://github.com/taichi-ishitani, @taichi-ishitani})、初田直也氏(@<href>{https://github.com/dalance, @dalance})にレビューして頂きました。
お二方には執筆中に見つけたバグをすぐに直して頂き、スムーズに執筆を進めることができました。
また、栗本龍一氏(@<href>{https://github.com/ryone9re, @ryone9re})には図や表を作るのを手伝っていただき、どうにか入稿に間に合わせることができました。

本書は大変に短い期間で執筆されたため、各所にご迷惑をおかけしました。
執筆にあたって関わったすべての方に、この場をお借りしてお礼申し上げます。
