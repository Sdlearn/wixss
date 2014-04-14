iptables -A PREROUTING -t nat -i eth0 -p tcp --dport 80 -j DNAT --to-destination 172.23.240.28

iptables -A PREROUTING -t nat -i eth0 -p udp --dport 53 -j DNAT --to-destination 172.23.240.28