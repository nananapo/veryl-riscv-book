# -*- coding: utf-8 -*-


require 'review/book'
require 'review/book/base'


module ReVIEW


  module Book


    class Base

      def parse_chapters
        conf = @config['starter']
        p = (conf['part_startnumber']    || 1) - 1  # 部番号
        c = (conf['chapter_startnumber'] || 1) - 1  # 章番号
        return enum_for(:_each_catalog_entry).map {|part_title, chap_files|
          chaps = chap_files.map {|chap_file|
            c += 1
            chap = _new_chapter(c, chap_file)
            c -= 1      unless chap.number  # 章番号をつけないなら、番号を戻す
            c = chap.number if chap.number  # 1ファイルに章が複数あったときの対応
            chap
          }
          p_ = part_title ? (p += 1) : nil
          _new_part(p_, chaps, part_title)
        }
      end

      private

      def _each_catalog_entry(&b)
        chap_files = []
        catalog().parts_with_chaps.each do |item|
          if item.is_a?(Hash)
            yield nil, chap_files unless chap_files.empty?
            chap_files = []
            item.each(&b)
          else
            chap_files << item
          end
        end
        yield nil, chap_files unless chap_files.empty?
      end

      def _new_chapter(chap_num, file)
        filepath = File.join(@basedir, file)
        return Chapter.new(self, chap_num, file, filepath)
      end

      def _new_part(part_num, chapters, title)
        return Part.new(self, part_num, chapters, title)
      end

    end


  end


end
