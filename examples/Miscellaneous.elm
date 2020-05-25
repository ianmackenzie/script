module Miscellaneous exposing (main)

import Duration
import Json.Decode as Decode
import Script exposing (Script)
import Script.Http as Http exposing (NetworkConnection)
import Time


script : Script.Init -> Script String ()
script { arguments, networkConnection } =
    case arguments of
        [ digitString ] ->
            case String.toInt digitString of
                Just integer ->
                    Script.succeed { text = "A", number = integer }
                        |> Script.aside
                            (\model ->
                                Script.do
                                    [ Script.printLine model.text
                                    , printCurrentTime networkConnection
                                    , Script.sleep (Duration.seconds 0.5)
                                    ]
                            )
                        |> Script.map .number
                        |> Script.aside
                            (\number ->
                                Script.do
                                    [ Script.printLine (String.fromInt number)
                                    , printCurrentTime networkConnection
                                    , Script.sleep (Duration.seconds 0.5)
                                    , getCurrentTime networkConnection |> Script.ignoreResult
                                    ]
                            )
                        |> Script.thenWith
                            (\number ->
                                if number > 2 then
                                    Script.printLine "Number is greater than 2"

                                else
                                    Script.fail "Number is not greater than 2"
                            )

                Nothing ->
                    Script.fail "Requires one command-line argument which is a number"

        _ ->
            Script.fail "Requires one command-line argument which is a number"


getCurrentTime : NetworkConnection -> Script String String
getCurrentTime networkConnection =
    let
        url =
            "http://worldtimeapi.org/api/ip"

        decoder =
            Decode.field "datetime" Decode.string
    in
    Http.get networkConnection
        { url = url
        , expect = Http.expectJson decoder
        }
        |> Script.mapError (always "HTTP request failed")


printCurrentTime : NetworkConnection -> Script String ()
printCurrentTime networkConnection =
    getCurrentTime networkConnection
        |> Script.thenWith (\time -> Script.printLine time)


main : Script.Program
main =
    Script.program script
