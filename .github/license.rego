package user.license_check

allowed_licenses := {
    "MIT",
    "Apache-2.0",
    "BSD-3-Clause",
    "ISC"
}

allowed_packages := {
    # LGPLだがサーバーサイドでの動作なので許容する
    "@img/sharp-libvips-linux-x64",
    "@img/sharp-libvips-linuxmusl-x64",
    # MPLだがビルド時にしか使われないので許容
    "lightningcss",
    "lightningcss-linux-x64-gnu",
    "lightningcss-linux-x64-musl"
}

deny contains msg if {
    license := input.Results[_].Licenses[_]
    
    license.Severity != "LOW"
    not allowed_licenses[license.Name]
    not allowed_packages[license.PkgName]

    msg := sprintf("NOT ALLOWED LICENSE: '%s' (package: %s)", [license.Name, license.PkgName])
}