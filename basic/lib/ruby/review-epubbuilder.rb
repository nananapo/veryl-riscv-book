# -*- coding: utf-8 -*-


require 'review/epubbuilder'


module ReVIEW

  defined?(EPUBBuilder)  or
    raise "ReVIEW::EPUBBuilder class not found."


  class EPUBBuilder

    def target_name
      "epub"
    end

    def inline_par(arg)
      case arg
      when 'i'
        #"<p class=\"indent\">"
        "<p class=\"indent\"></p>"  # TODO: (workaround)
      else
        #"<p>"
        "<p></p>"                   # TODO: (workaround)
      end
    end

  end


end
