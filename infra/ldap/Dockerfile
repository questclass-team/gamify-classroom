# Test OpenLDAP directory standing in for the faculty LABS domain. Development only.
FROM alpine:3.24

# Not pinned: Alpine drops old package versions, so pins break the build. Dependabot bumps the base image.
# hadolint ignore=DL3018
RUN apk add --no-cache openldap openldap-back-mdb openldap-clients \
    && install -d -o ldap -g ldap /run/openldap /var/lib/openldap/openldap-data

COPY slapd.conf.template entrypoint.sh /etc/openldap/
COPY sample-import.csv ldap-only.csv /etc/openldap/seed/

EXPOSE 389
ENTRYPOINT ["/bin/sh", "/etc/openldap/entrypoint.sh"]

HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
    CMD ["sh", "-c", "ldapsearch -x -H ldap://127.0.0.1 -b \"$LDAP_BASE_DN\" -s base -LLL dn > /dev/null || exit 1"]
