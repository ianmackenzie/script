module CopyFile exposing (main)

import Script exposing (Script)
import Script.Directory as Directory
import Script.File as File


script : Script.Init -> Script String ()
script { workingDirectory } =
    let
        sourceFile =
            File.in_ workingDirectory "test.txt"

        destinationFile =
            File.in_ workingDirectory "test-copied.txt"
    in
    File.copy sourceFile destinationFile


main : Script.Program
main =
    Script.program script
