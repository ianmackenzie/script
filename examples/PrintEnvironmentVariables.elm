module PrintEnvironmentVariables exposing (main)

import Script exposing (Script)
import Script.Environment as Environment exposing (Environment)


printEnvironmentVariable : Environment -> String -> Script x ()
printEnvironmentVariable environment name =
    let
        value =
            Environment.get name environment
                |> Maybe.withDefault "not defined"
    in
    Script.printLine (name ++ ": " ++ value)


script : Script.Init -> Script String ()
script { arguments, environment } =
    case arguments of
        [] ->
            Script.fail
                ("Please provide at least one command-line argument specifying"
                    ++ " environment variable names for which to get values."
                )

        _ ->
            arguments |> Script.each (printEnvironmentVariable environment)


main : Script.Program
main =
    Script.program script
