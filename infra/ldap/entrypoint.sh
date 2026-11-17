#!/bin/sh
# Renders slapd.conf, seeds the test accounts on first start, then runs slapd in the foreground.
set -eu

: "${LDAP_BASE_DN:?LDAP_BASE_DN is not set}"
: "${LDAP_ADMIN_PASSWORD:?LDAP_ADMIN_PASSWORD is not set}"
: "${LDAP_TEST_USER_PASSWORD:?LDAP_TEST_USER_PASSWORD is not set}"

conf=/etc/openldap/slapd.conf
data=/var/lib/openldap/openldap-data
seed=/etc/openldap/seed

admin_hash=$(slappasswd -s "$LDAP_ADMIN_PASSWORD")
sed -e "s|@BASE_DN@|$LDAP_BASE_DN|g" -e "s|@ADMIN_PASSWORD_HASH@|$admin_hash|" \
    /etc/openldap/slapd.conf.template > "$conf"

b64() { printf '%s' "$1" | base64 | tr -d '\n'; }

# One person entry per CSV row (login,first_name,last_name[,role]); the header is skipped.
# The role column is ignored: roles come from the CSV import into core, not from LDAP.
# Names are base64-encoded (`attr::`) because LDIF values must be ASCII.
people_ldif() {
    user_hash=$(slappasswd -s "$LDAP_TEST_USER_PASSWORD")
    for file in "$@"; do tail -n +2 "$file"; done | tr -d '\r' | while IFS=, read -r login first last _role; do
        [ -n "$login" ] || continue
        cat <<EOF
dn: uid=$login,ou=people,$LDAP_BASE_DN
objectClass: inetOrgPerson
uid: $login
givenName:: $(b64 "$first")
sn:: $(b64 "$last")
cn:: $(b64 "$first $last")
displayName:: $(b64 "$first $last")
userPassword: $user_hash

EOF
    done
}

if [ -z "$(ls -A "$data")" ]; then
    echo "Seeding test directory $LDAP_BASE_DN"
    top_dc=$(printf '%s' "$LDAP_BASE_DN" | sed -e 's/^dc=//' -e 's/,.*//')
    {
        printf 'dn: %s\nobjectClass: dcObject\nobjectClass: organization\ndc: %s\no: QuestClass test LABS\n\n' \
            "$LDAP_BASE_DN" "$top_dc"
        printf 'dn: ou=people,%s\nobjectClass: organizationalUnit\nou: people\n\n' "$LDAP_BASE_DN"
        people_ldif "$seed/sample-import.csv" "$seed/ldap-only.csv"
    } > /tmp/seed.ldif
    # A half-written database would be skipped on the next start, so wipe it on failure.
    if ! slapadd -f "$conf" -l /tmp/seed.ldif; then
        rm -rf "${data:?}"/*
        exit 1
    fi
    rm /tmp/seed.ldif
    chown -R ldap:ldap "$data"
fi

exec slapd -d 0 -h "ldap:///" -f "$conf" -u ldap -g ldap
