from rest_framework import serializers
from .models import Center, Infrastructure, Employee


class InfrastructureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Infrastructure
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class EmployeeSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name_bn = serializers.CharField(source='user.full_name_bn', read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ('created_at',)


class CenterListSerializer(serializers.ModelSerializer):
    infrastructure_count = serializers.SerializerMethodField()
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Center
        fields = (
            'id', 'code', 'name_bn', 'name_en', 'short_name_bn',
            'phone', 'email', 'status', 'infrastructure_count',
            'employee_count', 'created_at',
        )

    def get_infrastructure_count(self, obj):
        return obj.infrastructures.count()

    def get_employee_count(self, obj):
        return obj.employees.count()


class CenterDetailSerializer(serializers.ModelSerializer):
    infrastructures = InfrastructureSerializer(many=True, read_only=True)
    employees = EmployeeSerializer(many=True, read_only=True)

    class Meta:
        model = Center
        fields = '__all__'
        read_only_fields = ('created_at',)
