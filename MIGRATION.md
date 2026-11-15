# word-weaver: preserved planned game source

Source `apps/games/05-core-learning-strategy/word-weaver/` at `4f72ea86928666189b32f6f05c2c697a37341d06`.
Mechanical baseline `2de30df8f6da2c825da7465db2fdd982ea105133` preserves all2
current file blobs and modes with owned path history. Commit maps and original
full history remain in private recovery.

This separate change declares a public package and replaces cross-repository
relative imports with the shared library's public exports. Rules, snapshots, save versions and test assertions are unchanged. The shared validation/report/odds implementation lives in @webos/learning-game-core.

This is a source-only planned game core, not an enabled Desktop app. Rendering,
window lifecycle, audio, account storage and authorized human/agent host operations
still require implementation and real browser qualification. Existing version1
save incompatibilities remain explicit; no migration or simulated support is added.

Develop through the parent npm workspace or supply the declared shared package
from a verified local checkout. No registry publication, original-source import,
production service or historical account data is required.
