#!/bin/bash

for f in $(ls -1 *.png | grep -v ^_); do
  echo "${f} to _${f}"
  convert ${f} -filter point -resize 200% _${f}
done
