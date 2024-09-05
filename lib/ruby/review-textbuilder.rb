# -*- coding: utf-8 -*-

###
### ReVIEW::TEXTBuilderクラスを拡張する
###

require 'review/textbuilder'


module ReVIEW

  defined?(TEXTBuilder)  or raise "internal error: TEXTBuilder not found."


  class TEXTBuilder

    ## ファイル名
    def inline_file(str)
      on_inline_file { escape(str) }
    end
    def on_inline_file
      yield
    end

    ## ユーザ入力
    def inline_userinput(str)
      on_inline_input { escape(str) }
    end
    def on_inline_userinput
      yield
    end

  end


end
