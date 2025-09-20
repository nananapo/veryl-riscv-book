
run:
	yarn run docs:dev --host

build:
	rm -rf dist
	yarn run docs:build
	mv ./.vitepress/dist dist
	
import:
	rm -rf contents/basic
	cp -R ../veryl-riscv-book-md contents/basic
	cp -R ../images contents/basic/images

clean:
	rm -rf dist

.PHONY: run build import clean