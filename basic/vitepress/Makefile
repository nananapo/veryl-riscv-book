
run:
	yarn run docs:dev --host

build:
	rm -rf dist ../webroot
	yarn run docs:build
	cp -R ./public/* ./.vitepress/dist
	mv ./.vitepress/dist ../webroot
	
import:
	rm -rf contents/images
	cp -R ../veryl-riscv-book-md/* contents/
	cp -R ../images contents/images
	python3 ./tool/expand_image_background.py contents/images

clean:
	rm -rf dist

.PHONY: run build import clean
