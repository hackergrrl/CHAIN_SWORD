#!/bin/bash

REMOTE="stephen@stephenwhitmore.com"
REMOTE_DIR="chain-sword"
FILES="index.html game.js phaser.js assets"

VERSION=$(date +%b_%d_%Y_%H_%M_%S)

ssh ${REMOTE} "mkdir -p tmp/${REMOTE_DIR}/$VERSION/"
scp -r $FILES ${REMOTE}:"~/tmp/${REMOTE_DIR}/$VERSION/"
echo -ne "http://tmp.${REMOTE}/${REMOTE_DIR}/$VERSION"
echo -ne "http://tmp.${REMOTE}/${REMOTE_DIR}/$VERSION" | xclip -selection clipboard
